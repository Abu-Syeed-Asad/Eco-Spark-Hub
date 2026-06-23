import { Router } from "express";
import { categoryController } from "./category.controller";
import { createCategoryZodSchema } from "./category.zodSchema";
import { zodSchemaRequestValidation } from "../../middleware/RequestZodvalidation";
const router = Router()

router.post("/create",zodSchemaRequestValidation(createCategoryZodSchema) , categoryController.createCategory);


export const categoryRouter :Router =router