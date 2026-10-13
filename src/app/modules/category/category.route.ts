import { Router } from "express";
import { categoryController } from "./category.controller";
import { createCategoryZodSchema, updateCategoryZodSchema } from "./category.zodSchema";
import { zodSchemaRequestValidation } from "../../middleware/RequestZodvalidation";
import { checkAuth } from "../../middleware/checkAuth";
import { ROLE } from "../../../generated/prisma/enums";
const router = Router()

router.post(
  "/create",
  checkAuth(ROLE.ADMIN),
  zodSchemaRequestValidation(createCategoryZodSchema),
  categoryController.createCategory,
);
router.get("/show", categoryController.showAllcategory);
router.get("/show-by-id", categoryController.showCategoryById);
router.patch(
  "/update",
  checkAuth(ROLE.ADMIN),
  zodSchemaRequestValidation(updateCategoryZodSchema),
  categoryController.categoryUpdate,
);
router.delete("/delete", checkAuth(ROLE.ADMIN), categoryController.categoryDelete);


export const categoryRouter :Router =router