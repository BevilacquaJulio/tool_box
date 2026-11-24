import mysql from 'mysql2/promise';
import { DbVerifyRepository } from './db-verify.repository';
import { summarizeGrants } from './db-verify.service';

jest.mock('mysql2/promise', () => ({ __esModule: true, default: { createConnection: jest.fn() } }));

const createConnection = mysql.createConnection as jest.Mock;
const options = {
  host: 'db.example.test',
  port: 3306,
  user: 'u',
  password: 'p',
  database: 'app',
  connectTimeout: 1000,
  queryTimeout: 1000,
};

describe('DbVerifyRepository', () => {
  beforeEach(() => createConnection.mockReset());

  it('tries TLS first', async () => {
    createConnection.mockResolvedValue({ query: jest.fn(), end: jest.fn() });
    await new DbVerifyRepository().connect(options);
    expect(createConnection).toHaveBeenCalledTimes(1);
    expect(createConnection.mock.calls[0][0].ssl).toEqual({ rejectUnauthorized: false });
  });

  it('falls back to plain TCP only when the server has no TLS support', async () => {
    createConnection
      .mockRejectedValueOnce(Object.assign(new Error('no ssl'), { code: 'HANDSHAKE_NO_SSL_SUPPORT' }))
      .mockResolvedValueOnce({ query: jest.fn(), end: jest.fn() });

    await new DbVerifyRepository().connect(options);

    expect(createConnection).toHaveBeenCalledTimes(2);
    expect(createConnection.mock.calls[1][0].ssl).toBeUndefined();
  });

  it('does not retry on other errors (e.g. wrong password)', async () => {
    createConnection.mockRejectedValue(Object.assign(new Error('denied'), { errno: 1045 }));
    await expect(new DbVerifyRepository().connect(options)).rejects.toMatchObject({ errno: 1045 });
    expect(createConnection).toHaveBeenCalledTimes(1);
  });
});

describe('summarizeGrants', () => {
  it('keeps global and database grants, unescaping wildcard underscores', () => {
    const rows = [
      { 'Grants for u@%': 'GRANT USAGE ON *.* TO `u`@`%`' },
      { 'Grants for u@%': 'GRANT ALL PRIVILEGES ON `my\\_app`.* TO `u`@`%`' },
      { 'Grants for u@%': 'GRANT SELECT ON `other`.* TO `u`@`%`' },
      { 'Grants for u@%': 'GRANT `reader`@`%` TO `u`@`%`' },
    ];
    expect(summarizeGrants(rows, 'My_App')).toEqual(['My_App: ALL PRIVILEGES']);
    expect(summarizeGrants([{ g: 'GRANT SELECT, RELOAD ON *.* TO `u`@`%`' }], 'app')).toEqual(['Global: SELECT, RELOAD']);
  });
});
