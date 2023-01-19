angular.module('Realize.webStorage.storageDecorator', [
        'webStorageModule'
    ])
    .config(['$provide',
        function($provide) {
            'use strict';

            $provide.decorator('webStorage', [
                '$delegate',
                function($delegate) {

                    // Keys mentioned in localStorageKeysToBePersisted will be persisted
                    var localStorageKeysToBePersisted = [
                        new RegExp('^standardMasteryByClass.*'),
                        new RegExp('^standardMasteryByAssignment.*')
                    ];

                    // Implemented logic to persist only specific keys from local storage.
                    // Cleared Session storage and removed other keys from local storage.
                    function decoratedClear(allEngines) {
                        allEngines = typeof allEngines !== 'undefined' ? !!allEngines : true;
                        Object.keys(localStorage).forEach(function(localStorageKey) {
                            var keyExists = localStorageKeysToBePersisted.find(function(
                                localStorageKeyRegExp) {
                                return localStorageKeyRegExp.test(localStorageKey);
                            });
                            if (!keyExists) {
                                $delegate.local.remove(localStorageKey);
                            }
                        });

                        if (allEngines) {
                            $delegate.session.clear();
                            $delegate.memory.clear();
                        }
                    }
                    $delegate.clear = decoratedClear;

                    return $delegate;
                }
            ]);
        }
    ]);
