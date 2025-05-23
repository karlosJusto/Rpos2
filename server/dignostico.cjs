// C:\Users\c.justo\Downloads\impresora\impresora\server\diagnose-escpos.cjs
const escpos = require('escpos');

console.log('--- ESCPOS Module Diagnosis ---');

if (escpos) {
  console.log('`escpos` module loaded successfully.');
  console.log('Keys in `escpos` object:', Object.keys(escpos));

  console.log('Type of `escpos.Network`:', typeof escpos.Network);

  if (typeof escpos.Network === 'function') {
    console.log('✅ `escpos.Network` IS a function/constructor.');
    // Let's try to instantiate it (without actually connecting)
    try {
      const TestNetworkDevice = escpos.Network; // Assign to a variable first
      const device = new TestNetworkDevice('1.2.3.4', 9100);
      console.log('✅ Successfully instantiated `escpos.Network`.');
    } catch (e) {
      console.error('❌ FAILED to instantiate `escpos.Network`. Error:', e);
    }
  } else {
    console.error('❌ `escpos.Network` is NOT a function. Actual type:', typeof escpos.Network);
    if (escpos.Network) {
      console.log('Value of `escpos.Network`:', escpos.Network);
    }
  }

  // Check for other common properties to understand the escpos object structure
  console.log('Type of `escpos.Printer`:', typeof escpos.Printer);
  console.log('Type of `escpos.USB` (if it exists from escpos v3 core):', typeof escpos.USB);

} else {
  console.error('❌ CRITICAL: `escpos` module could not be loaded.');
}

console.log('--- End of Diagnosis ---');
