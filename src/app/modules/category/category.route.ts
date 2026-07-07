import { Router } from "express";
import { categoryController } from "./category.controller";
import { createCategoryZodSchema } from "./category.zodSchema";
import { zodSchemaRequestValidation } from "../../middleware/RequestZodvalidation";
const router = Router()

router.post("/create", zodSchemaRequestValidation(createCategoryZodSchema), categoryController.createCategory);
router.get("/show", categoryController.showAllcategory);
router.get("/show-by-id", categoryController.showCategoryById);
router.patch("/update", categoryController.categoryUpdate);
router.delete("/delete", categoryController.categoryDelete);    


export const categoryRouter :Router =router