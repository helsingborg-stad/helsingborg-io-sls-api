export default function validateApplicationStatus(statusList, requiredCodeList) {
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
