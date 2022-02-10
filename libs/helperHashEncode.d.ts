export default hash;
declare namespace hash {
    export { encode };
}
/**
 * Helper function to hash encode personal number
 *
 * @param {number} number Personal number to be hashed
 * @param {string} hashSalt Hash security salt
 * @param {number} hashSaltLength Hash security salt length
 * @returns {string} Hashed personal number
 */
declare function encode(number: number, hashSalt: string, hashSaltLength: number): string;
