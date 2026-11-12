import assert from "node:assert/strict";
import test from "node:test";

test("staff session is signed without embedding the password", async () => {
  process.env.STAFF_USER = "uniao";
  process.env.STAFF_PASSWORD = "senha-loja";
  process.env.STAFF_SECRET = "chave-separada";
  const { checkStaffLogin, createStaffSession, verifyStaffSession } = await import("../app/staff-auth.ts");

  assert.equal(checkStaffLogin("uniao", "senha-loja"), true);
  assert.equal(checkStaffLogin("uniao", "errada"), false);

  const token = await createStaffSession();
  assert.equal(token.includes("senha-loja"), false);
  assert.equal(token.includes("chave-separada"), false);
  assert.equal(await verifyStaffSession(token), true);
  assert.equal(await verifyStaffSession("v1.1.abc"), false);
});

test("API interna (inclusive banners) exige login; banners-publico continua aberto", async () => {
  process.env.STAFF_USER = "uniao";
  process.env.STAFF_PASSWORD = "senha-loja";
  process.env.STAFF_SECRET = "chave-separada";
  const { NextRequest } = await import("next/server.js");
  const { middleware } = await import("../middleware.ts");
  const { STAFF_COOKIE, createStaffSession } = await import("../app/staff-auth.ts");
  const token = await createStaffSession();

  const pedir = (path, method = "GET", cookie) =>
    middleware(
      new NextRequest(`http://localhost${path}`, {
        method,
        headers: cookie ? { cookie: `${STAFF_COOKIE}=${cookie}` } : {},
      }),
    );
  const liberou = (res) => res.headers.get("x-middleware-next") === "1";

  const internas = [
    "/api/interno/banners",
    "/api/interno/catalogo",
    "/api/interno/fotos/enviar",
    "/api/interno/produto/excluir",
    "/api/interno/rota-nova-qualquer",
  ];
  for (const path of internas) {
    for (const method of ["GET", "POST", "DELETE"]) {
      const semLogin = await pedir(path, method);
      assert.equal(liberou(semLogin), false, `${method} ${path} sem login não pode passar`);
      // Mesmo comportamento das outras rotas internas: manda para a tela de entrar (os painéis detectam
      // o redirecionamento e levam a pessoa ao login).
      assert.ok([302, 307].includes(semLogin.status), `${method} ${path} sem login deve redirecionar`);
      assert.match(semLogin.headers.get("location") || "", /\/interno\/entrar/);
      assert.equal(semLogin.headers.get("cache-control"), "no-store");

      const sessaoFalsa = await pedir(path, method, "v1.9999999999999.abc");
      assert.equal(liberou(sessaoFalsa), false, `${method} ${path} com sessão falsa não pode passar`);
      assert.ok([302, 307].includes(sessaoFalsa.status));

      const comLogin = await pedir(path, method, token);
      assert.equal(liberou(comLogin), true, `${method} ${path} com login deve passar`);
    }
  }

  // As páginas do painel também mandam para a tela de entrar.
  const pagina = await pedir("/interno/promocoes");
  assert.ok([302, 307].includes(pagina.status));
  assert.match(pagina.headers.get("location") || "", /\/interno\/entrar/);

  // O login em si e a leitura pública dos banners continuam abertos.
  assert.equal(liberou(await pedir("/api/interno/login", "POST")), true);
  assert.equal(liberou(await pedir("/api/banners-publico")), true);
  assert.equal(liberou(await pedir("/")), true);
});
