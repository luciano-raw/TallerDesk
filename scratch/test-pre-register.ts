import { preRegistrarUsuario } from '../src/lib/db-actions';

async function main() {
  const res = await preRegistrarUsuario('luciano.raw04@gmail.com', 'Luciano Test', 'some-fake-taller-id', 'TALLER_TECNICO');
  console.log(res);
}
main();