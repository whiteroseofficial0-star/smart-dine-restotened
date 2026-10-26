-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COUNTER', 'CASH', 'UPI', 'ONLINE');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('ASSISTANCE', 'WATER', 'CUTLERY', 'BILL');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantSettings" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "serviceChargePercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "openTime" TEXT NOT NULL DEFAULT '09:00',
    "closeTime" TEXT NOT NULL DEFAULT '23:00',
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceLang" TEXT NOT NULL DEFAULT 'en-IN',
    "voiceRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "voiceVolume" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "announceTemplate" TEXT NOT NULL DEFAULT 'Attention! New order received. Table {table}. Order number {order}. {items}.',
    "kitchenWarnMinutes" INTEGER NOT NULL DEFAULT 15,
    "autoSendToKitchen" BOOLEAN NOT NULL DEFAULT true,
    "receiptFooter" TEXT NOT NULL DEFAULT 'Thank you for dining with us!',
    "gstin" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "qrActive" BOOLEAN NOT NULL DEFAULT true,
    "seats" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL,
    "taxPercent" DECIMAL(5,2),
    "imageUrl" TEXT,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuOption" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "rejectReason" TEXT,
    "kitchenSentAt" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxTotal" DECIMAL(10,2) NOT NULL,
    "serviceCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "instructions" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "userId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reference" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRequest" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantSettings_restaurantId_key" ON "RestaurantSettings"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_restaurantId_role_idx" ON "User"("restaurantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiningTable_qrToken_key" ON "DiningTable"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "DiningTable_restaurantId_number_key" ON "DiningTable"("restaurantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_restaurantId_name_key" ON "MenuCategory"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "MenuItem_restaurantId_categoryId_available_idx" ON "MenuItem"("restaurantId", "categoryId", "available");

-- CreateIndex
CREATE INDEX "MenuOption_menuItemId_idx" ON "MenuOption"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");

-- CreateIndex
CREATE INDEX "Order_restaurantId_status_createdAt_idx" ON "Order"("restaurantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_tableId_createdAt_idx" ON "Order"("tableId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_restaurantId_orderNumber_key" ON "Order"("restaurantId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "StaffRequest_restaurantId_status_idx" ON "StaffRequest"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "Notification_restaurantId_createdAt_idx" ON "Notification"("restaurantId", "createdAt");

-- AddForeignKey
ALTER TABLE "RestaurantSettings" ADD CONSTRAINT "RestaurantSettings_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiningTable" ADD CONSTRAINT "DiningTable_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOption" ADD CONSTRAINT "MenuOption_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRequest" ADD CONSTRAINT "StaffRequest_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
