import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  courseInput,
  courseUpdate,
  departmentInput,
  departmentUpdate,
  organizationInput,
  organizationListQuery,
  organizationUpdate,
  uuidParam,
} from "@lsms/shared";
import { requirePermission } from "../../auth/authorize";
import {
  createCollege,
  createCourse,
  createDepartment,
  listColleges,
  listCourses,
  listDepartments,
  updateCollege,
  updateCourse,
  updateDepartment,
} from "./organization.service";

export async function organizationRoutes(app: FastifyInstance) {
  app.get("/api/v1/colleges/", async (request) => {
    const input = organizationListQuery.parse(request.query);
    if (input.includeInactive)
      await requirePermission(request, "organization.read");
    return listColleges(input);
  });
  app.post("/api/v1/colleges/", async (request, reply) => {
    const actor = await requirePermission(request, "organization.write");
    return reply
      .code(201)
      .send(
        await createCollege(organizationInput.parse(request.body), actor.id),
      );
  });
  app.patch("/api/v1/colleges/:id/", async (request) => {
    const actor = await requirePermission(request, "organization.write");
    return updateCollege(
      uuidParam.parse(request.params).id,
      organizationUpdate.parse(request.body),
      actor.id,
    );
  });

  app.get("/api/v1/courses/", async (request) => {
    const input = organizationListQuery
      .extend({ collegeId: z.uuid().optional() })
      .parse(request.query);
    if (input.includeInactive)
      await requirePermission(request, "organization.read");
    return listCourses(input);
  });
  app.post("/api/v1/courses/", async (request, reply) => {
    const actor = await requirePermission(request, "organization.write");
    return reply
      .code(201)
      .send(await createCourse(courseInput.parse(request.body), actor.id));
  });
  app.patch("/api/v1/courses/:id/", async (request) => {
    const actor = await requirePermission(request, "organization.write");
    return updateCourse(
      uuidParam.parse(request.params).id,
      courseUpdate.parse(request.body),
      actor.id,
    );
  });

  app.get("/api/v1/departments/", async (request) => {
    const input = organizationListQuery.parse(request.query);
    if (input.includeInactive)
      await requirePermission(request, "organization.read");
    return listDepartments(input);
  });
  app.post("/api/v1/departments/", async (request, reply) => {
    const actor = await requirePermission(request, "organization.write");
    return reply
      .code(201)
      .send(
        await createDepartment(departmentInput.parse(request.body), actor.id),
      );
  });
  app.patch("/api/v1/departments/:id/", async (request) => {
    const actor = await requirePermission(request, "organization.write");
    return updateDepartment(
      uuidParam.parse(request.params).id,
      departmentUpdate.parse(request.body),
      actor.id,
    );
  });
}
