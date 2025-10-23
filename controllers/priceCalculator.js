/**
 * Calcula el precio según la sucursal y la edad del niño.
 * @param {string} branch Sucursal.
 * @param {string} age Edad del niño.
 * @returns {number} Precio mensual.
 */
function calculatePrice(branch, age) {
    if (branch === 'City Center') {
        return 3300;
    } else if (branch === 'German Colony') {
        return age === 'less than one year' ? 3800 : 3600;
    } else {
        throw new Error('Sucursal no válida.');
    }
}

module.exports = calculatePrice;
