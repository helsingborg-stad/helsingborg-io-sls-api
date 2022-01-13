import { putEvent } from '../../../libs/awsEventBridge';

export const eventTypeCollection = {
    notFound: {
        detailType: 'usersMsFindUserUnsucceeded',
        source: 'usersMs.findUser',
    },
    exists: {
        detailType: 'usersMsFindUserSuccess',
        source: 'usersMs.findUser',
    },
    createSuccess: {
        detailType: 'usersMsCreateUserSuccess',
        source: 'usersMs.createUser',
    },
};

function putUserEvent(user, type, typeCollection = eventTypeCollection) {
    const { detailType, source } = typeCollection[type];

    return putEvent(user, detailType, source);
}

export default {
    notFound: (userDetail) => putUserEvent(userDetail, 'notFound'),
    exists: (userDetail) => putUserEvent(userDetail, 'exists'),
    createSuccess: (userDetail) => putUserEvent(userDetail, 'createSuccess'),
};
