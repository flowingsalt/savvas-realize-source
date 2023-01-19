angular.module('Realize.ExternalItem.DataGenerator', [])
    .factory('ExternalAssignmentDataGenerator', [
        'Content',
        'ASSIGNMENT_CONSTANTS',
        '$q',
        function(Content, ASSIGNMENT_CONSTANTS, $q) {
            'use strict';

            var service = function(externalSource, itemToBeAssigned, createNewAssignment, helper) {

                var ret = angular.extend(this, helper);

                ret.itemToBeAssigned = itemToBeAssigned;
                ret.createNewAssignment = createNewAssignment;

                //getContent must return a promise to match contentAssignmentDataGenerator
                ret.getContent = function() {
                    var deferredContent = $q.defer();

                    deferredContent.resolve(ret.itemToBeAssigned);

                    return deferredContent.promise;
                };

                ret.getAssignmentData = function() {
                    var assignmentObj;
                    if (ret.createNewAssignment) {
                        // adjust reference if customized item is used (non-ajax, so no need to wait)
                        ret.itemToBeAssigned = ret.itemToBeAssigned.$getDefaultVersion();

                        var itemTitle = ret.itemToBeAssigned.title,
                            itemTitleLength = itemTitle.length;

                        assignmentObj = ret.createAssignmentObjectInCreateMode(ret.itemToBeAssigned);
                        assignmentObj.title = itemTitleLength > ASSIGNMENT_CONSTANTS.TITLE_MAX_LENGTH ? itemTitle
                            .substring(0, ASSIGNMENT_CONSTANTS.TITLE_MAX_LENGTH) : itemTitle;
                        assignmentObj.externalSourceId = ret.itemToBeAssigned.id;
                        assignmentObj.assignmentSource =  externalSource;

                        ret.itemToBeAssigned.assignmentAttachment =
                            ret.createAssignmentAttachment(ret.itemToBeAssigned);

                    }
                    return assignmentObj;
                };

                return ret;
            };

            return service;
        }
    ]);
