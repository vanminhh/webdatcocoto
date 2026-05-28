const fs = require("fs");

function generateCustomers(count = 100) {
    const customers = [];

    for (let i = 1; i <= count; i++) {
        customers.push({
            name: `Customer ${i}`,
            email: `customer${i}@example.com`,
            phoneNumber: `0900000${String(i).padStart(3, '0')}`
        });
    }

    return customers;
}

// Tạo 100 customer
const customers = generateCustomers(600);

// Ghi ra file
fs.writeFileSync("customers.json", JSON.stringify(customers, null, 2));
console.log("✅ File customers.json đã được tạo thành công!");