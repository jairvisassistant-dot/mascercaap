import type { SalesPoint } from "@/types";

export const salesPoints: SalesPoint[] = [
  {
    id: "point-1",
    name: "Punto Principal - Chicó",
    address: "Calle 94 #15-32, Local 102",
    neighborhood: "El Chicó, Bogotá",
    schedule: "Lun - Sáb: 6:00 AM - 8:00 PM",
    phone: "+57 300 123 4567",
  },
  {
    id: "point-2",
    name: "Punto de Venta - Restrepo",
    address: "Carrera 19 #14-25, Centro Comercial",
    neighborhood: "Restrepo, Bogotá",
    schedule: "Lun - Dom: 7:00 AM - 6:00 PM",
    phone: "+57 300 234 5678",
  },
  {
    id: "point-3",
    name: "Punto de Venta - Usme",
    address: "Calle 68 Sur #3-42",
    neighborhood: "Usme, Bogotá",
    schedule: "Lun - Sáb: 5:30 AM - 5:00 PM",
    phone: "+57 300 345 6789",
  },
];