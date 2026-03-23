import axios from 'axios';

async function checkHealth() {
    try {
        const response = await axios.get('http://localhost:3000/api/health');
        console.log("Health Check:", JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error("Health Check Failed:", error.message);
    }
}

checkHealth();
