-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "bus" ADD COLUMN     "passengerCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "iot_device" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "deviceKeyHash" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "firmwareVer" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentBusId" TEXT,

    CONSTRAINT "iot_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_device_assignment" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "iotDeviceId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "bus_device_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "iot_device_serialNumber_key" ON "iot_device"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "iot_device_deviceKeyHash_key" ON "iot_device"("deviceKeyHash");

-- CreateIndex
CREATE UNIQUE INDEX "iot_device_currentBusId_key" ON "iot_device"("currentBusId");

-- CreateIndex
CREATE INDEX "bus_device_assignment_busId_idx" ON "bus_device_assignment"("busId");

-- CreateIndex
CREATE INDEX "bus_device_assignment_iotDeviceId_idx" ON "bus_device_assignment"("iotDeviceId");

-- AddForeignKey
ALTER TABLE "iot_device" ADD CONSTRAINT "iot_device_currentBusId_fkey" FOREIGN KEY ("currentBusId") REFERENCES "bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_device_assignment" ADD CONSTRAINT "bus_device_assignment_busId_fkey" FOREIGN KEY ("busId") REFERENCES "bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_device_assignment" ADD CONSTRAINT "bus_device_assignment_iotDeviceId_fkey" FOREIGN KEY ("iotDeviceId") REFERENCES "iot_device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
