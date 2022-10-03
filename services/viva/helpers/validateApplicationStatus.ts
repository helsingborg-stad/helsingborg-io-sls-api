import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

export default function validateApplicationStatus(
  statusList: VivaApplicationsStatusItem[],
  requiredCodeList: number[]
): boolean {
  if (!Array.isArray(statusList)) {
    return false;
  }
  const uniqueStatusCodes = new Set(statusList.map(({ code }) => code));
  const uniqueRequiredCodes = new Set(requiredCodeList);

  const isEqualSize = uniqueStatusCodes.size === uniqueRequiredCodes.size;
  const hasSameCodes = [...uniqueStatusCodes].every(code =>
    [...uniqueRequiredCodes].includes(code)
  );

  return isEqualSize && hasSameCodes;
}
