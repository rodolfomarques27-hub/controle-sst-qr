import assert from "node:assert/strict";
import {
  adicionarFotosAuditoria,
  removerFotoAuditoria,
  montarRegistrosFotosAuditoria,
  LIMITE_FOTOS_POR_FASE,
} from "../src/services/auditoriaCampoFotosMultiplasService.js";

const foto = (nome) => ({
  name: nome,
  type: "image/jpeg",
  size: 1024,
});

const fotos = adicionarFotosAuditoria([], [
  foto("a.jpg"),
  foto("b.jpg"),
]);

assert.equal(fotos.length, 2);
assert.equal(removerFotoAuditoria(fotos, 0).length, 1);

assert.throws(
  () => adicionarFotosAuditoria(fotos, [foto("c.jpg")], 2),
  /Limite/
);

assert.throws(
  () => adicionarFotosAuditoria([], [{
    name: "x.exe",
    type: "application/octet-stream",
    size: 100,
  }]),
  /Formato/
);

const empresaId = "11111111-1111-4111-8111-111111111111";
const auditoriaId = "22222222-2222-4222-8222-222222222222";

const registros = montarRegistrosFotosAuditoria({
  auditoriaId,
  empresaId,
  fotos: [
    {
      fase: "antes",
      caminho: `${empresaId}/auditorias-internas/teste/a.jpg`,
      mimeType: "image/jpeg",
      nome: "a.jpg",
    },
    {
      fase: "antes",
      caminho: `${empresaId}/auditorias-internas/teste/b.jpg`,
      mimeType: "image/jpeg",
      nome: "b.jpg",
    },
    {
      fase: "depois",
      caminho: `${empresaId}/auditorias-internas/teste/c.jpg`,
      mimeType: "image/jpeg",
      nome: "c.jpg",
    },
  ],
});

assert.deepEqual(
  registros.map((item) => [item.fase, item.ordem]),
  [["antes", 1], ["antes", 2], ["depois", 1]]
);

assert.equal(registros[0].empresa_id, empresaId);
assert.equal(LIMITE_FOTOS_POR_FASE, 8);

assert.throws(
  () => montarRegistrosFotosAuditoria({
    auditoriaId,
    empresaId,
    fotos: [
      {
        fase: "antes",
        caminho: "../invalido.jpg",
        mimeType: "image/jpeg",
      },
    ],
  }),
  /Caminho/
);

console.log("AUDITORIA_MULTIFOTOS_G2B_SMOKE=GREEN");
