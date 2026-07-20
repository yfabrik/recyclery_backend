import type { EmployeeDto } from "@recyclerie/api/responses/employees";

import type Employee from "../models/employee.js";
import type EmployeeWorkdays from "../models/employeeworkdays.js";
import type Recyclery from "../models/recyclery.js";
import type Skill from "../models/skill.js";
import { asEmail, asPhone } from "./brands.js";
import { toEmployeeWorkdayDto } from "./employeeWorkdays.js";
import { toRecycleryRef } from "./refs.js";
import { toSkillDto } from "./skills.js";
import { toIsoDate } from "./serialize.js";
import { stripUndefined, type MapperInput } from "./types.js";

type EmployeeMapperInput = MapperInput<Employee> & {
  stores?: Array<MapperInput<Recyclery>>;
  EmployeeWorkdays?: Array<MapperInput<EmployeeWorkdays>>;
  skills?: Array<MapperInput<Skill>>;
};

export const toEmployeeDto = (model: EmployeeMapperInput): EmployeeDto => {
  const employee = model as Employee;

  return stripUndefined({
    id: model.id,
    nom: model.nom,
    prenom: model.prenom,
    isActive: model.isActive,
    phone: asPhone(model.phone),
    email: asEmail(model.email),
    fullName: employee.fullName,
    workTime: employee.workTime,
    createdAt: toIsoDate(model.createdAt),
    updatedAt: toIsoDate(model.updatedAt),
    stores: model.stores
      ?.map((store) => toRecycleryRef(store))
      .filter((store): store is NonNullable<typeof store> => store != null),
    EmployeeWorkdays: model.EmployeeWorkdays?.map(toEmployeeWorkdayDto),
    skills: model.skills
      ?.map((skill) => toSkillDto(skill))
      .filter((skill): skill is NonNullable<typeof skill> => skill != null),
  }) satisfies EmployeeDto;
};
