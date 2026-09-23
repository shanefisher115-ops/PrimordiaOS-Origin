export const Random = {
  int(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  float(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  },

  choice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
};
