export default function validateApplicationStatus(statusList, requiredStatusCodes) {
  if (!Array.isArray(statusList)) {
    return false;
  }
  const filteredStatusList = statusList.filter(status => requiredStatusCodes.includes(status.code));
  return filteredStatusList.length === requiredStatusCodes.length;
}
