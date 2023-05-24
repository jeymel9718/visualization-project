export type Product = {
    balance: string;
    name: string;
    value: number;
} 
 
export type Country = {
    name: string;
    products: Product[];
}

export type CSVData = {
    Country: string;
    Time: string;
    Balance: string;
    Product: string;
    Value: number;
    Unit: string; 
}

export const ConsumtionsProperties = [
    'P.Coal, Peat and Manufactured Gases',
    'P.Combustible Renewables',
    'P.Geothermal',
    'P.Hydro',
    'P.Nuclear',
    'P.Oil and Petroleum Products',
    'P.Other Renewables',
    'P.Solar',
    'P.Wind',
    'P.Solar',
    'P.Natural Gas',
];