import { prisma } from "../src/app/lib/prisma";

const posts = await prisma.post.findMany({
  take: 10,
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    title: true,
    status: true,
    postType: true,
    createdAt: true,
  },
});

console.log(JSON.stringify(posts, null, 2));

await prisma.$disconnect();
