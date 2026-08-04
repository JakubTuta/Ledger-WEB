export interface AttributeEntry {
  name: string
  value: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isBranchValue(value: unknown): boolean {
  if (Array.isArray(value))
    return value.length > 0

  return isPlainObject(value) && Object.keys(value).length > 0
}

// Objects are sorted so scalar values read first and nested groups sink to the
// bottom; array order is meaningful, so it is preserved.
export function toAttributeEntries(value: unknown): AttributeEntry[] {
  if (Array.isArray(value))
    return value.map((item, index) => ({ name: `[${index}]`, value: item }))

  if (!isPlainObject(value))
    return []

  return Object.entries(value)
    .map(([name, entryValue]) => ({ name, value: entryValue }))
    .sort((a, b) => {
      const branchDiff = Number(isBranchValue(a.value)) - Number(isBranchValue(b.value))

      return branchDiff !== 0
        ? branchDiff
        : a.name.localeCompare(b.name)
    })
}

export function formatAttributeValue(value: unknown): string {
  if (value === null)
    return 'null'
  if (value === undefined)
    return 'undefined'
  if (typeof value === 'string') {
    return value === ''
      ? '""'
      : value
  }
  if (Array.isArray(value))
    return '[]'
  if (typeof value === 'object')
    return '{}'

  return String(value)
}

export function attributeValueClass(value: unknown): string {
  if (value === null || value === undefined)
    return 'text-disabled font-italic'
  if (typeof value === 'number')
    return 'text-info'
  if (typeof value === 'boolean')
    return 'text-warning'
  if (typeof value === 'object')
    return 'text-disabled'

  return ''
}
