import bcrypt from "bcryptjs";
import { Permission } from "./domain/entities/Permission";
import { Role } from "./domain/entities/Role";
import prisma from "./config/db";

const rolePermissions: Record<string, string[]> = {
  [Role.ATENDENTE]: [
    Permission.CRIAR_LEAD,
    Permission.EDITAR_LEAD,
    Permission.VER_LEAD,
    Permission.CRIAR_CLIENTE,
    Permission.EDITAR_CLIENTE,
    Permission.VER_CLIENTE,
    Permission.CRIAR_NEGOCIACAO,
    Permission.EDITAR_NEGOCIACAO,
    Permission.VER_NEGOCIACAO,
    Permission.VER_DASHBOARD_OPERACIONAL,
    Permission.DOCUMENTS_VIEW,
    Permission.AGENDA_VIEW,
    Permission.AGENDA_CREATE,
  ],
  [Role.GERENTE]: [
    Permission.CRIAR_LEAD,
    Permission.EDITAR_LEAD,
    Permission.VER_LEAD,
    Permission.VER_CLIENTE,
    Permission.VER_NEGOCIACAO,
    Permission.VER_DASHBOARD_OPERACIONAL,
    Permission.VER_DASHBOARD_ANALITICO,
    Permission.DOCUMENTS_VIEW,
    Permission.DOCUMENTS_CREATE,
    Permission.AGENDA_VIEW,
    Permission.AGENDA_CREATE,
    Permission.AGENDA_DELETE,
  ],
  [Role.GERENTE_GERAL]: [
    Permission.VER_LEAD,
    Permission.VER_CLIENTE,
    Permission.VER_NEGOCIACAO,
    Permission.VER_DASHBOARD_OPERACIONAL,
    Permission.VER_DASHBOARD_ANALITICO,
    Permission.DOCUMENTS_VIEW,
    Permission.DOCUMENTS_CREATE,
    Permission.FINANCE_MANAGE,
    Permission.AGENDA_VIEW,
    Permission.AGENDA_CREATE,
    Permission.AGENDA_DELETE,
  ],
  [Role.ADMIN]: [
    Permission.CRIAR_LEAD,
    Permission.EDITAR_LEAD,
    Permission.VER_LEAD,
    Permission.EXCLUIR_LEAD,
    Permission.CRIAR_CLIENTE,
    Permission.EDITAR_CLIENTE,
    Permission.VER_CLIENTE,
    Permission.CRIAR_NEGOCIACAO,
    Permission.EDITAR_NEGOCIACAO,
    Permission.VER_NEGOCIACAO,
    Permission.VER_DASHBOARD_OPERACIONAL,
    Permission.VER_DASHBOARD_ANALITICO,
    Permission.VER_LOGS,
    Permission.GERENCIAR_USUARIOS,
    Permission.GERENCIAR_EQUIPES,
    Permission.GERENCIAR_TODOS_LEADS,
    Permission.DOCUMENTS_VIEW,
    Permission.DOCUMENTS_CREATE,
    Permission.DOCUMENTS_DELETE,
    Permission.FINANCE_MANAGE,
    Permission.AGENDA_VIEW,
    Permission.AGENDA_CREATE,
    Permission.AGENDA_DELETE,
  ],
};

async function upsertTeam(id: string, name: string) {
  return prisma.team.upsert({
    where: { name },
    update: {},
    create: { id, name },
  });
}

async function upsertRole(name: string, description: string) {
  return prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function upsertPermission(name: string) {
  return prisma.permission.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function seedDatabase() {
  await Promise.all([
    upsertTeam("team-pa",             "Equipe PA"),
    upsertTeam("team-cacapava",       "Equipe Caçapava"),
    upsertTeam("team-sjc-cassiopeia", "SJC - Cassiopeia"),
    upsertTeam("team-sjc-base",       "SJC - Base"),
  ]);

  const roles = await Promise.all([
    upsertRole(Role.ATENDENTE, "Atendente - acessa apenas seus proprios leads"),
    upsertRole(Role.GERENTE, "Gerente - acessa atendentes e leads da sua equipe"),
    upsertRole(Role.GERENTE_GERAL, "Gerente Geral - acessa dados consolidados de todas as equipes"),
    upsertRole(Role.ADMIN, "Administrador - acesso total ao sistema"),
  ]);

  const permissions = await Promise.all(
    [...new Set(Object.values(rolePermissions).flat())].map((permission) => upsertPermission(permission)),
  );

  const permissionByName = new Map(permissions.map((permission) => [permission.name, permission.id]));

  for (const role of roles) {
    const permissionNames = rolePermissions[role.name] ?? [];
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: permissionNames.map((permissionName) => {
            const permissionId = permissionByName.get(permissionName);
            if (!permissionId) {
              throw new Error(`Permissao ${permissionName} nao encontrada.`);
            }
            return { id: permissionId };
          }),
        },
      },
    });
  }

  const adminRole          = roles.find((role) => role.name === Role.ADMIN);
  const generalManagerRole = roles.find((role) => role.name === Role.GERENTE_GERAL);
  const managerRole        = roles.find((role) => role.name === Role.GERENTE);
  const attendantRole      = roles.find((role) => role.name === Role.ATENDENTE);

  if (!adminRole || !generalManagerRole || !managerRole || !attendantRole) {
    throw new Error("Roles obrigatorios nao foram criados.");
  }

  await prisma.user.upsert({
    where: { email: "admin@sistema.com" },
    update: { roleId: adminRole.id },
    create: {
      name: "Administrador",
      email: "admin@sistema.com",
      password: await bcrypt.hash("Admin@2026", 10),
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "gerente.geral@sistema.com" },
    update: { roleId: generalManagerRole.id },
    create: {
      name: "Gerente Geral",
      email: "gerente.geral@sistema.com",
      password: await bcrypt.hash("GerenteGeral@2026", 10),
      roleId: generalManagerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "gerente@sistema.com" },
    update: { roleId: managerRole.id },
    create: {
      name: "Gerente Local",
      email: "gerente@sistema.com",
      password: await bcrypt.hash("Gerente@2026", 10),
      roleId: managerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "vendedor@sistema.com" },
    update: { roleId: attendantRole.id },
    create: {
      name: "Vendedor",
      email: "vendedor@sistema.com",
      password: await bcrypt.hash("Vendedor@2026", 10),
      roleId: attendantRole.id,
    },
  });

  // ── Perfis reais ──────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { email: "marcin.bueno@sistema.com" },
    update: { name: "Marcin Bueno", roleId: adminRole.id, password: await bcrypt.hash("Marcin@2026", 10) },
    create: {
      name: "Marcin Bueno",
      email: "marcin.bueno@sistema.com",
      password: await bcrypt.hash("Marcin@2026", 10),
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "vinicius.oliveira@sistema.com" },
    update: { name: "Vinicius Oliveira", roleId: generalManagerRole.id, password: await bcrypt.hash("Vinicius@2026", 10) },
    create: {
      name: "Vinicius Oliveira",
      email: "vinicius.oliveira@sistema.com",
      password: await bcrypt.hash("Vinicius@2026", 10),
      roleId: generalManagerRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "pedro.rosa@sistema.com" },
    update: { name: "Pedro Rosa", roleId: managerRole.id, teamId: "team-sjc-cassiopeia", password: await bcrypt.hash("Pedro@2026", 10) },
    create: {
      name: "Pedro Rosa",
      email: "pedro.rosa@sistema.com",
      password: await bcrypt.hash("Pedro@2026", 10),
      roleId: managerRole.id,
      teamId: "team-sjc-cassiopeia",
    },
  });

  await prisma.user.upsert({
    where: { email: "davi.snaider@sistema.com" },
    update: { name: "Davi Snaider", roleId: managerRole.id, teamId: "team-sjc-base", password: await bcrypt.hash("Davi@2026", 10) },
    create: {
      name: "Davi Snaider",
      email: "davi.snaider@sistema.com",
      password: await bcrypt.hash("Davi@2026", 10),
      roleId: managerRole.id,
      teamId: "team-sjc-base",
    },
  });

  await prisma.user.upsert({
    where: { email: "thiago.nunes@sistema.com" },
    update: { name: "Thiago Nunes", roleId: attendantRole.id, teamId: "team-sjc-cassiopeia", password: await bcrypt.hash("Thiago@2026", 10) },
    create: {
      name: "Thiago Nunes",
      email: "thiago.nunes@sistema.com",
      password: await bcrypt.hash("Thiago@2026", 10),
      roleId: attendantRole.id,
      teamId: "team-sjc-cassiopeia",
    },
  });

  await prisma.user.upsert({
    where: { email: "eric.franca@sistema.com" },
    update: { name: "Eric França", roleId: attendantRole.id, teamId: "team-sjc-base", password: await bcrypt.hash("Eric@2026", 10) },
    create: {
      name: "Eric França",
      email: "eric.franca@sistema.com",
      password: await bcrypt.hash("Eric@2026", 10),
      roleId: attendantRole.id,
      teamId: "team-sjc-base",
    },
  });
}

seedDatabase()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed RBAC concluido.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
