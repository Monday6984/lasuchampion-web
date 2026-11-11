import * as migration_20261111_124825_initial from './20261111_124825_initial';

export const migrations = [
  {
    up: migration_20261111_124825_initial.up,
    down: migration_20261111_124825_initial.down,
    name: '20261111_124825_initial'
  },
];
