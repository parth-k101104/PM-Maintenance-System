import { QRTask, ScannedEquipmentDetails } from "../types/api";

const EQUIPMENT_ID_KEYS = [
  "equipmentId",
  "equipmentID",
  "equipment_id",
  "machineId",
  "machine_id",
  "eqId",
  "eq_id",
  "id",
];

const ELEMENT_ID_KEYS = [
  "equipmentElementId",
  "equipment_element_id",
  "elementId",
  "element_id",
  "machineElementId",
  "machine_element_id",
];

const PART_ID_KEYS = [
  "equipmentPartId",
  "equipment_part_id",
  "partId",
  "part_id",
  "machinePartId",
  "machine_part_id",
];

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function spreadNested(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "object" && value && !Array.isArray(value) ? value : {};
}

function flattenQrObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  return {
    ...source,
    ...spreadNested(source, "equipment"),
    ...spreadNested(source, "machine"),
    ...spreadNested(source, "element"),
    ...spreadNested(source, "part"),
  };
}

function paramsToObject(params: URLSearchParams) {
  const output: Record<string, unknown> = {};
  params.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

export function parseEquipmentQr(rawValue: string): ScannedEquipmentDetails {
  const trimmed = rawValue.trim();
  let parsedObject: Record<string, unknown> = {};

  try {
    parsedObject = flattenQrObject(JSON.parse(trimmed));
  } catch {
    try {
      const url = new URL(trimmed);
      parsedObject = paramsToObject(url.searchParams);
    } catch {
      const normalizedParams = trimmed.replace(/[;,|]/g, "&");
      parsedObject = paramsToObject(new URLSearchParams(normalizedParams));
    }
  }

  return {
    rawValue,
    equipmentId: readNumber(parsedObject, EQUIPMENT_ID_KEYS),
    equipmentElementId: readNumber(parsedObject, ELEMENT_ID_KEYS),
    equipmentPartId: readNumber(parsedObject, PART_ID_KEYS),
  };
}

export function formatQrTaskHierarchy(task: QRTask) {
  return [task.machineName, task.machineElementName, task.machinePartName]
    .filter(Boolean)
    .join(" > ");
}

export function dedupeQrTasks(tasks: QRTask[]) {
  const seen = new Set<number>();
  return tasks.filter((task) => {
    if (seen.has(task.scheduleExecutionId)) {
      return false;
    }

    seen.add(task.scheduleExecutionId);
    return true;
  });
}
