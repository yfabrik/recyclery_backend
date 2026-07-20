import type {
  EmployeeStoreAssignmentDto,
  EmployeeWithStoreAssignmentsDto,
} from "@recyclerie/api/responses/employeeStore";

import type Employee from "../models/employee.js";
import type EmployeeStore from "../models/employeestore.js";
import type Recyclery from "../models/recyclery.js";
import { toEmployeeDto } from "./employees.js";
import { toRecycleryRef } from "./refs.js";
import { stripUndefined, type MapperInput } from "./types.js";

type EmployeeStoreAssignmentInput = MapperInput<Recyclery> & {
  EmployeeStore?: MapperInput<EmployeeStore>;
};

export const toEmployeeStoreAssignmentDto = (
  store: EmployeeStoreAssignmentInput,
): EmployeeStoreAssignmentDto => {
  const ref = toRecycleryRef(store)!;
  return stripUndefined({
    ...ref,
    ...(store.EmployeeStore?.is_primary != null
      ? { is_primary: store.EmployeeStore.is_primary }
      : {}),
  }) satisfies EmployeeStoreAssignmentDto;
};

export const toEmployeeWithStoreAssignmentsDto = (
  employee: Employee,
): EmployeeWithStoreAssignmentsDto => {
  const base = toEmployeeDto(employee);
  const stores = employee.stores?.map((store) =>
    toEmployeeStoreAssignmentDto(store),
  );
  return stripUndefined({
    ...base,
    ...(stores ? { stores } : {}),
  }) satisfies EmployeeWithStoreAssignmentsDto;
};

export const toEmployeeStoreListDto = (
  employees: Employee[],
): EmployeeWithStoreAssignmentsDto[] =>
  employees.map(toEmployeeWithStoreAssignmentsDto);
