import { prisma } from "../../lib/prisma"
import type { IPostInterface } from "./post.interface"

const createPost = async (payload:IPostInterface) => {
try {
  const postCreate = await prisma.post.create({
    data:payload 
  })
  return postCreate
} catch (error) {
  console.log(error)
}
  
}

export const postService = {
  createPost
}