import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') return res.status(400).json({ error: "ID tidak valid" });

  if (req.method === 'PUT') {
    const { name, email, role, emailVerified, image } = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { name, email, role, emailVerified, image: image || null },
      });
      return res.status(200).json(updatedUser);
    } catch (error) {
      return res.status(500).json({ error: "Gagal update user" });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.user.delete({ where: { id } });
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: "Gagal hapus user" });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}