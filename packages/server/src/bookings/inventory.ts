export type InventorySnapshot = Readonly<{
  id: string;
  available: number;
  overbookingLimit: number;
}>;

export type InventoryPort = Readonly<{
  load(roomTypeId: string, date: Date): Promise<InventorySnapshot | null>;
  compareAndDecrement(id: string, expectedAvailable: number): Promise<boolean>;
  increment(id: string): Promise<void>;
}>;

export async function reserveInventory(
  port: InventoryPort,
  roomTypeId: string,
  dates: readonly Date[],
  overbookingEnabled: boolean,
): Promise<void> {
  for (const date of dates) {
    const inventory = await port.load(roomTypeId, date);
    if (!inventory) throw new InventoryUnavailableError(date, "Inventory is not configured for this date");
    const floor = overbookingEnabled ? -inventory.overbookingLimit : 0;
    if (inventory.available <= floor) throw new InventoryUnavailableError(date, "No sellable inventory remains");
    const changed = await port.compareAndDecrement(inventory.id, inventory.available);
    if (!changed) throw new InventoryConcurrencyError(date);
  }
}

export async function releaseInventory(port: InventoryPort, roomTypeId: string, dates: readonly Date[]): Promise<void> {
  for (const date of dates) {
    const inventory = await port.load(roomTypeId, date);
    if (!inventory) throw new Error(`Cannot release missing inventory for ${date.toISOString().slice(0, 10)}`);
    await port.increment(inventory.id);
  }
}

export class InventoryUnavailableError extends Error {
  constructor(public readonly date: Date, message: string) {
    super(message);
    this.name = "InventoryUnavailableError";
  }
}

export class InventoryConcurrencyError extends Error {
  constructor(public readonly date: Date) {
    super("Inventory changed while the booking was being created");
    this.name = "InventoryConcurrencyError";
  }
}
