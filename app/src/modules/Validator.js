/* global schema */

(function () {
    'use strict';

    angular
            .module('apic')
            .factory('Validator', Validator);

    Validator.$inject = ['Const'];
    function Validator(Const) {
        var service = {
            environment: environment,
            testFolder: testFolder,
            apiProject: apiProject,
            testSuit: testSuit,
            testProj: testProj,
            history: history
        };

        function environment(data,sendError) {
            if (!data) {
                return false;
            }

            var valSchema = schema({
                key: String,
                val: String
            });
            var envSchema = schema({
                _created: Number,
                _id: String,
                name: String.of(1, 30, null),
                vals: Array.of(valSchema)
            });
            var mainSchema = schema({
                TYPE: 'Environment',
                value: [Array.of(envSchema), envSchema]
            });

            if(mainSchema(data)=== true){
                return true;
            }else if(sendError === true){
                return mainSchema.errors(data);
            }
            return false;
        }
        
        function testFolder(data, sendError){
            var reqSchema = schema({
                _id : String,
                '?_time' : Number,
                url : String,
                method : Const.http_methodes.concat(['Stomp', 'Websocket', 'Socketio', 'SSE']),
                '?Req': Object,
                '?prescript' : undefined,
                '?postscript' : undefined,
                name : String,
                description : undefined,
                _parent : undefined
            });
            
            var folderSchema = schema({
                _id : String,
                _created : Number,
                _modified : Number,
                name : String,
                desc : undefined,
                '?_parent' : [null, String],
                '?requests': Array.of(reqSchema),
                '?children':[[],Array.of(schema.self)]
            });
            
            var mainSchema = schema({
                TYPE: 'Folder',
                value: folderSchema
            });
            
            if(mainSchema(data)=== true){
                return true;
            }else if(sendError === true){
                return mainSchema.errors(data);
            }
            return false;
        }
        
        function apiProject(data, sendError){
            var projectSchema = schema({
                _id : String,
                title : String,
                version : String,
                '?description' : [null, String],
                '?termsOfService' : [null, String],
                '?license' : [null,{
                        '?name':String,
                        '?url':String
                    }],
                '?contact' : [null, {
                        '?name':String,
                        '?url':String,
                        '?email':String
                    }],
                '?endpoints': [null, Object],
                '?traits': [null, Object],
                '?models': [null, Object],
                '?folders': [null, Object]
            });
            
            var mainSchema = schema({
                TYPE: 'APIC Api Project',
                value: projectSchema
            });
            
            if(mainSchema(data)=== true){
                return true;
            }else if(sendError === true){
                return mainSchema.errors(data);
            }
            return false;
        }
        
        function testSuit(data, sendError){
            var suitSchema = schema({
                _id : String,
                _modified : Number,
                _created : Number,
                name : String,
                projId : String,
                reqs : Array
            });
            
            var mainSchema = schema({
                TYPE: 'APICSuite',
                value: suitSchema
            });
            
            if(mainSchema(data)=== true){
                return true;
            }else if(sendError === true){
                return mainSchema.errors(data);
            }
            return false;
        }
        
        function testProj(data, sendError){
            var projSchema = schema({
                _id : String,
                _modified : Number,
                _created : Number,
                name : String,
                suits : Object
            });
            var mainSchema = schema({
                TYPE: 'APICTestProject',
                value: projSchema
            });
            
            if(mainSchema(data)=== true){
                var allSuitsValid = true;
                var suitIds = Object.keys(data.value.suits);
                for(var i=0; i< suitIds.length; i++){
                    allSuitsValid = testSuit({
                        TYPE: 'APICSuite',
                        value:data.value.suits[suitIds[i]]
                    });
                }
                if(allSuitsValid){
                    return true;
                }else{
                    return false;
                }
            }else if(sendError === true){
                return mainSchema.errors(data);
            }
            return false;
        }
        
        function history(data, sendError){
            var mainSchema = schema({
                TYPE: 'History',
                value: Object
            });
            
            if(mainSchema(data)=== true){
                return true;
            }else if(sendError === true){
                return mainSchema.errors(data);
            }
            return false;
        }
        return service;
    }
})();