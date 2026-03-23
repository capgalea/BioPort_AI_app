import axios from 'axios';

async function testServerPV() {
    try {
        const response = await axios.get('http://localhost:3000/api/test-pv?q=biotech');
        console.log("Server PV Test (biotech):", JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error("Server PV Test Failed:", error.response?.data || error.message);
    }
}

testServerPV();
