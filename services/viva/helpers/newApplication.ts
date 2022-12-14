import type { VivaParametersResponse } from '../types/ssmParameters';

export function isFormNewApplication(
  formIds: VivaParametersResponse,
  targetFormIdValue: string
): boolean {
  return Object.entries(formIds).some(
    ([key, value]) => key.startsWith('new') && value === targetFormIdValue
  );
}
