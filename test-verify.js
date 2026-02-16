const axios = require('axios');

async function testVerify() {
  try {
    const response = await axios.post('http://localhost:3000/api/verify', {
      referenceCode: {
        language: 'c',
        code: 'int add(int a, int b) { return a + b; }\nint main() { return add(5, 3); }'
      },
      userCode: {
        language: 'c',
        code: 'int add(int x, int y) { return x + y; }\nint main() { return add(5, 3); }'
      }
    });

    console.log('\n=== VERIFICATION RESULT ===');
    console.log('Verdict:', response.data.verdict);
    console.log('Efficiency Rating:', response.data.efficiency_rating);
    console.log('\nAST Analysis:');
    console.log(JSON.stringify(response.data.analysis['3_structural_similarity'], null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testVerify();
