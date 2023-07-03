/**********************************
 * Base64 Core
 **********************************/
((root, factory) => {
    if (typeof define === 'function' && define.amd)
        define(['base64js'], factory);
    else if (typeof module === 'object' && module.exports)
        module.exports = factory(require('base64js'));
    else
        root.base64url = factory(root.base64js);
})(this, base64js => {

    function ensureUint8Array(arg) {
        if (arg instanceof ArrayBuffer)
            return new Uint8Array(arg);
        else
            return arg;
    }

    function base64UrlToMime(code) {
        return code.replace(/-/g, '+').replace(/_/g, '/') + '===='.substring(0, (4 - (code.length % 4)) % 4);
    }

    function mimeBase64ToUrl(code) {
        return code.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    function fromByteArray(bytes) {
        return mimeBase64ToUrl(base64js.fromByteArray(ensureUint8Array(bytes)));
    }

    function toByteArray(code) {
        return base64js.toByteArray(base64UrlToMime(code));
    }

    return {
        fromByteArray,
        toByteArray,
    };

});


/*******************************************************
 * WebAuthN Core
 *******************************************************/

((root, factory) => {
    if (typeof define === 'function' && define.amd)
        define(['base64url'], factory);
    else if (typeof module === 'object' && module.exports)
        module.exports = factory(require('base64url'));
    else
        root.webauthn = factory(root.base64url);
})(this, base64url => {

    function extend(obj, more) {
        return Object.assign({}, obj, more);
    }

    /**
     * Create a WebAuthn credential.
     *
     * @param request: object - A PublicKeyCredentialCreationOptions object, except
     *   where binary values are base64url encoded strings instead of byte arrays
     *
     * @return a PublicKeyCredentialCreationOptions suitable for passing as the
     *   `publicKey` parameter to `navigator.credentials.create()`
     */
    function decodePublicKeyCredentialCreationOptions(request) {
        const excludeCredentials = request.excludeCredentials.map(credential => extend(
            credential, {
                id: base64url.toByteArray(credential.id),
            }));

        const publicKeyCredentialCreationOptions = extend(
            request, {
                attestation: 'direct',
                user: extend(
                    request.user, {
                        id: base64url.toByteArray(request.user.id),
                    }),
                challenge: base64url.toByteArray(request.challenge),
                excludeCredentials,
            });

        return publicKeyCredentialCreationOptions;
    }

    /**
     * Create a WebAuthn credential.
     *
     * @param request: object - A PublicKeyCredentialCreationOptions object, except
     *   where binary values are base64url encoded strings instead of byte arrays
     *
     * @return the Promise returned by `navigator.credentials.create`
     */
    function createCredential(request) {
        return navigator.credentials.create({
            publicKey: decodePublicKeyCredentialCreationOptions(request),
        });
    }

    /**
     * Perform a WebAuthn assertion.
     *
     * @param request: object - A PublicKeyCredentialRequestOptions object,
     *   except where binary values are base64url encoded strings instead of byte
     *   arrays
     *
     * @return a PublicKeyCredentialRequestOptions suitable for passing as the
     *   `publicKey` parameter to `navigator.credentials.get()`
     */
    function decodePublicKeyCredentialRequestOptions(request) {
        const allowCredentials = request.allowCredentials && request.allowCredentials.map(credential => extend(
            credential, {
                id: base64url.toByteArray(credential.id),
            }));

        const publicKeyCredentialRequestOptions = extend(
            request, {
                allowCredentials,
                challenge: base64url.toByteArray(request.challenge),
            });

        return publicKeyCredentialRequestOptions;
    }

    /**
     * Perform a WebAuthn assertion.
     *
     * @param request: object - A PublicKeyCredentialRequestOptions object,
     *   except where binary values are base64url encoded strings instead of byte
     *   arrays
     *
     * @return the Promise returned by `navigator.credentials.get`
     */
    function getAssertion(request) {
        return navigator.credentials.get({
            publicKey: decodePublicKeyCredentialRequestOptions(request),
        });
    }


    /** Turn a PublicKeyCredential object into a plain object with base64url encoded binary values */
    function responseToObject(response) {
        if (response.u2fResponse) {
            return response;
        } else {
            let clientExtensionResults = {};

            try {
                clientExtensionResults = response.getClientExtensionResults();
            } catch (e) {
                console.error('getClientExtensionResults failed', e);
            }

            if (response.response.attestationObject) {
                return {
                    type: response.type,
                    id: response.id,
                    response: {
                        attestationObject: base64url.fromByteArray(response.response.attestationObject),
                        clientDataJSON: base64url.fromByteArray(response.response.clientDataJSON),
                    },
                    clientExtensionResults,
                };
            } else {
                return {
                    type: response.type,
                    id: response.id,
                    response: {
                        authenticatorData: base64url.fromByteArray(response.response.authenticatorData),
                        clientDataJSON: base64url.fromByteArray(response.response.clientDataJSON),
                        signature: base64url.fromByteArray(response.response.signature),
                        userHandle: response.response.userHandle && base64url.fromByteArray(response.response.userHandle),
                    },
                    clientExtensionResults,
                };
            }
        }
    }

    return {
        decodePublicKeyCredentialCreationOptions,
        decodePublicKeyCredentialRequestOptions,
        createCredential,
        getAssertion,
        responseToObject,
    };

});


/*****************************************************
 * WebAuthn Utilities
 *****************************************************/

let ceremonyState = {};
let session = {};

function extend(obj, more) {
    return Object.assign({}, obj, more);
}

function rejectIfNotSuccess(response) {
    if (response.success)
        return response;
    return new Promise((resolve, reject) => reject(response));
}

function updateSession(response) {
    if (response.sessionToken)
        session.sessionToken = response.sessionToken;
    else
        session.sessionToken = null;
    if (response.username)
        session.username = response.username;
    else
        session.username = null;
    return response;
}

function logout() {
    session = {};
    updateSession({});
}

function rejected(err) {
    document.body.className = 'error';
    return new Promise((resolve, reject) => reject(err));
}

function addMessage(message) {
    document.getElementById('error-message').innerHTML += `<p>${message}</p>`;
}

function addMessages(messages) {
    messages.forEach(addMessage);
}

function getWebAuthnUrls() {
    let endpoints = {authenticate: "webauthn/authenticate", register: "webauthn/register"};
    return new Promise((resolve, reject) => resolve(endpoints));
}

function getRegisterRequest(urls, username, displayName, credentialNickname, requireResidentKey = false) {
    return fetch(urls.register, {
        body: new URLSearchParams({username, displayName, credentialNickname, requireResidentKey,
                                   sessionToken: session.sessionToken || null}),
        headers: {"X-CSRF-TOKEN": csrfToken},
        method: 'POST'
    }).then(response => response.json()).then(updateSession).then(rejectIfNotSuccess);
}

function submitResponse(url, {requestId, sessionToken}, response) {
    const body = {requestId: requestId, credential: response,
                  sessionToken: sessionToken || session.sessionToken || null};

    return fetch(url, {
        method: 'POST',
        headers: {"X-CSRF-TOKEN": csrfToken},
        body: JSON.stringify(body)
    }).then(response => response.json()).then(updateSession);
}

function performCeremony(params) {
    const callbacks = params.callbacks || {};
    const getWebAuthnUrls = params.getWebAuthnUrls;
    const getRequest = params.getRequest;
    const executeRequest = params.executeRequest;

    return getWebAuthnUrls().then(urls => {
        if (callbacks.init)
            callbacks.init(urls);
        return getRequest(urls);
    }).then(params => {
        const request = params.request;
        const urls = params.actions;
        if (callbacks.authenticatorRequest)
            callbacks.authenticatorRequest({request, urls});
        ceremonyState = {callbacks, request, urls};
        return executeRequest(request).then(webauthn.responseToObject).catch(rejected);
    }).then(finishCeremony);
}

function finishCeremony(response) {
    const callbacks = ceremonyState.callbacks;
    const request = ceremonyState.request;
    const urls = ceremonyState.urls;

    document.body.classList.remove('start');
    document.body.classList.add('pending');
    if (callbacks.serverRequest)
        callbacks.serverRequest({urls, request, response});

    return submitResponse(urls.finish, request, response);
}

function register(username, displayName, credentialNickname, csrfToken, requireResidentKey = false,
                  getRequest = getRegisterRequest) {
    let request;
    return performCeremony({
        getWebAuthnUrls,
        getRequest: urls => getRequest(urls, username, displayName, credentialNickname,
                                       requireResidentKey),
        executeRequest: req => {
            request = req;
            return webauthn.createCredential(req.publicKeyCredentialCreationOptions);
        }
    }).then(({registration}) => {
        if (registration) {
            const nicknameInfo = {nickname: registration.credentialNickname};
            document.getElementById('sessionToken').value = session.sessionToken;
            document.getElementById('form').submit();
        }
    }).catch(err => {
        if (err.name === 'NotAllowedError') {
            if (request.publicKeyCredentialCreationOptions.excludeCredentials
                && request.publicKeyCredentialCreationOptions.excludeCredentials.length > 0) {
                addMessage('Credential creation failed, probably because an already registered credential is available.');
            }
            else {
                addMessage('Credential creation failed for an unknown reason.');
            }
        }
        else if (err.name === 'InvalidStateError') {
            addMessage(`This authenticator is already registered for the account "${username}".`)
        }
        else if (err.message) {
            addMessage(err.message);
        }
        else if (err.messages) {
            addMessages(err.messages);
        }
        return rejected(err);
    });
}

function getAuthenticateRequest(urls, username) {
    return fetch(urls.authenticate, {
        body: new URLSearchParams(username ? {username} : {}),
        headers: {"X-CSRF-TOKEN": csrfToken},
        method: 'POST'
    }).then(response => response.json()).then(updateSession).then(rejectIfNotSuccess);
}

function authenticate(username = null, getRequest = getAuthenticateRequest) {
    document.getElementById('error-message').innerHTML = '';
    return performCeremony({
        getWebAuthnUrls,
        getRequest: urls => getRequest(urls, username),
        executeRequest: ({publicKeyCredentialRequestOptions}) =>
                            webauthn.getAssertion(publicKeyCredentialRequestOptions)
    }).then(data => {
        if (data.registrations) {
            setTimeout(() => {
                document.body.classList.remove('pending');
                document.body.classList.add('ok');
                document.getElementById('token').value = data.sessionToken;
                document.getElementById('form').submit();
            }, 1000);
        }
        return data;
    }).catch(err => {
        if (err.name === 'InvalidStateError')
            addMessage(`This authenticator is not registered for the account "${username}".`)
        else if (err.message)
            addMessage(err.message);
        else if (err.messages)
            addMessages(err.messages);
        return rejected(err);
    });
}
