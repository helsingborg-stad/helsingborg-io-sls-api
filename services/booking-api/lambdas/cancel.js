import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
    const bookingId = decodeURIComponent(event.pathParameters.id);

    const [error] = await to(booking.cancel(bookingId));
    if (error) {
        return response.failure(error);
    }

    return response.success(200, { bookingId });
}
