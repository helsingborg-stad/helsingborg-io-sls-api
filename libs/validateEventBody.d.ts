/**
 * @param {obj} body
 * @param {func} callback the callback function must return an array with the following values [isValid::Boolean, errorStatusCode::Integear, errorMesseage::String], where isValid and errorStatusCode are required and erroMessage is optional.
 */
export function validateEventBody(body: obj, callback: func): Promise<obj>;
