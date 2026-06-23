import { Router } from "express";
import { categoryController } from "./category.controller";
const router = Router()

router.post("/create", categoryController.createCategory);


export const categoryRouter :Router =router