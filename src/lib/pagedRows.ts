type Result<T> = { data: T[] | null; error: unknown };

const PAGE_SIZE = 500;

export async function allRows<T>(read: (from: number, to: number) => PromiseLike<Result<T>>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await read(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data) throw new Error('Missing query data');
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}
