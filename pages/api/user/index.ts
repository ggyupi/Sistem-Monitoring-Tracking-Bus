import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(users);
    } catch (error) {
      return res.status(500).json({ error: "Gagal mengambil data user" });
    }
  }

  if (req.method === 'POST') {
    const { name, email, role, emailVerified, image } = req.body;
    try {
      const newUser = await prisma.user.create({
        data: {
          id: randomUUID(),
          name,
          email,
          role: role || 'USER',
          emailVerified: emailVerified || false,
          image: image || null,
        },
      });
      return res.status(201).json(newUser);
    } catch (error) {
      return res.status(500).json({ error: "Gagal membuat user" });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}