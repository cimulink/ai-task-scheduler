import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description too long')
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetProjects(req, res)
  } else if (req.method === 'POST') {
    return handleCreateProject(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleGetProjects(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    res.status(200).json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleCreateProject(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const validatedData = createProjectSchema.parse(req.body)

    const project = await prisma.project.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        userId: user.id,
        status: 'draft'
      }
    })

    res.status(201).json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Error creating project:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}