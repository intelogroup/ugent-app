import { SerialQueue } from '@/lib/serial-queue';

describe('SerialQueue', () => {
  it('runs jobs strictly one at a time, in push order', async () => {
    const queue = new SerialQueue();
    const order: number[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const p1 = queue.push(async () => {
      order.push(1);
      await delay(30);
      order.push(2);
      return 'a';
    });
    const p2 = queue.push(async () => {
      order.push(3);
      return 'b';
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2, 3]);
    expect(r1).toBe('a');
    expect(r2).toBe('b');
  });

  it('a later job still runs after an earlier job rejects', async () => {
    const queue = new SerialQueue();
    const failing = queue.push(async () => {
      throw new Error('boom');
    });
    const succeeding = queue.push(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(succeeding).resolves.toBe('ok');
  });
});
