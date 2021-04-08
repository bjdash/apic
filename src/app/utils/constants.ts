import { environment } from '../../environments/environment';

function getDemoData() {
    var data: any = {}, ts = '123456abcdef';

    data.demoDesignProj = { "title": "APIC Todo demo", "version": "v2", _created: ts, _modified: ts, "description": "This is a set of sample APIS to demonstrate how the Designer, Tester (running a request, Test Suites etc) & Docs work.", "contact": { "name": "APIC", "url": "https://apic.app/identity/#!/feedback", "email": "hello@apic.app" }, _id: ts + '-apiproj-demo', "folders": { "1489390890584": { "_id": 1489390890584, "name": "Models", "desc": "This folder will hold all the models" } }, "models": { "1489394735056": { "_id": 1489394735056, "name": "Todo", "folder": 1489390890584, "nameSpace": "Todo", "data": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } }, "setting": { "host": "apic.app", "basePath": "/apic-demo", "protocol": "https", envId: ts + '-env-demo' }, "endpoints": { "1489395152484": { "_id": 1489395152484, "operationId": "", "method": "post", "schemes": [{ "key": "https", "val": "HTTPS" }], "path": "/v2/todo", "folder": "", "tags": [], "consumes": ["application/json"], "produces": ["application/json"], "traits": [], "summary": "Create Todo", "description": "The API to create a todo. Providing todo name is mandatory.", "pathParams": { "type": "object" }, "queryParams": { "type": "object" }, "headers": { "type": "object" }, "responses": [{ "data": { "type": "object", "properties": { "todo": { "$ref": "#/definitions/Todo" }, "message": { "type": "string", "enum": ["Todo created successfully"] } }, "required": ["todo", "message"] }, "code": "201", "desc": "To do successfully created. Newly created Todo details are in the response" }, { "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Please provide a ToDo Name"] } }, "required": ["message"] }, "code": "400", "desc": "Todo creation failed because Todo name was not provided" }], "resp": { "data": { "type": "object", "properties": { "todo": { "$ref": "#/definitions/Todo" }, "message": { "type": "string", "enum": ["Todo created successfully"] } }, "required": ["todo", "message"] }, "code": "201", "desc": "To do successfully created. Newly created Todo details are in the response" }, "body": { "type": "raw", "data": { "type": "object", "properties": { "name": { "type": "string" } }, "required": ["name"] } }, "postrun": "apic.test(\"Check that Status code is 201 (Created)\", function(){\n\texpect($response.status).to.be.eql(201);\n});\napic.test(\"Response data should match the schema for status 201\", function(){\n\texpect($response).to.matchSchema(201);\n});\napic.test(\"$response.data.todo.name should be equal to $request.body.name\", function(){\n\texpect($response.data.todo.name).to.be.eql($request.body.name);\n});\napic.test(\"$response.data.message should be equal to \\\"Todo created successfully\\\"\", function(){\n\texpect($response.data.message).to.be.eql(\"Todo created successfully\");\n});\napic.test(\"$response.data.todo.id should exist in response\", function(){\n\texpect($response.data.todo).to.have.property(\"id\");\n});\napic.test(\"$response.data.todo.created should be a(n) date\", function(){\nexpect($response.data.todo.created).to.be.a.date;\n});\n\n\n//save the newly created Todo id in environment\nvar newId = $response.data.todo.id;\nlog(\"new todo id is: \"+newId);\nsetEnv(\"todoId\", newId);\n" }, "1489395400717": { "_id": 1489395400717, "operationId": "", "method": "get", "schemes": [{ "key": "https", "val": "HTTPS" }], "path": "/v2/todo/{todoId}", "folder": "", "tags": [], "consumes": ["application/json"], "produces": ["application/json"], "traits": [], "summary": "Get Todo detail", "description": "The API to get the to do by providing its id in the path API path as a path parameter", "pathParams": { "type": "object", "properties": { "todoId": { "type": "string" } }, "required": ["todoId"] }, "queryParams": { "type": "object" }, "headers": { "type": "object" }, "responses": [{ "data": { "type": "object", "properties": { "todo": { "$ref": "#/definitions/Todo" }, "message": { "type": "string", "enum": ["Todo retrived successfully"] } }, "required": ["todo", "message"] }, "code": "200", "desc": "Todo retrieved successfully" }, { "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Failed to fetch todo detail"] } } }, "code": "404", "desc": "No Todo found based on the given id" }], "resp": { "data": { "type": "object", "properties": { "todo": { "$ref": "#/definitions/Todo" }, "message": { "type": "string", "enum": ["Todo retrived successfully"] } }, "required": ["response", "message"] }, "code": "200", "desc": "Todo retrieved successfully" }, "postrun": "apic.test(\"Check that Status code is 200\", function(){\n\texpect($response.status).to.be.eql(200);\n});\napic.test(\"Response data should match the schema specified against status 200\", function(){\n\texpect($response).to.matchSchema(200);\n});\napic.test(\"$response.data.todo.id should be equal to environment variable todoId\", function(){\n\texpect( $response.data.todo.id).to.be.eql(getEnv(\"todoId\"))\n})" }, "1489395547584": { "_id": 1489395547584, "operationId": "", "method": "delete", "schemes": [{ "key": "https", "val": "HTTPS" }], "path": "/v2/todo/{todoId}", "folder": "", "tags": [], "consumes": ["application/json"], "produces": ["application/json"], "traits": [], "summary": "Delete Todo", "description": "", "pathParams": { "type": "object", "properties": { "todoId": { "type": "string" } }, "required": ["todoId"] }, "queryParams": { "type": "object" }, "headers": { "type": "object" }, "responses": [{ "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Todo deleted"] } }, "required": ["message"] }, "code": "200" }, { "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Couldn't find the specified todo"] } }, "required": ["message"] }, "code": "404", "desc": "Couldn't find the specified Todo" }], "resp": { "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Todo deleted"] } }, "required": ["message"] }, "code": "200" }, "body": { "type": "raw", "data": { "type": "object" } }, "postrun": "apic.test(\"Check that Status code is 200\", function(){\n\texpect($response.status).to.be.eql(200)\n});\napic.test(\"Response data should match the schema specified against status 200\", function(){\n\texpect($response).to.matchSchema(200);\n});\napic.test(\"$response.data.message should be equal to \\\"Todo deleted\\\"\", function(){\n\texpect($response.data.message).to.be.eql(\"Todo deleted\");\n})" } } };

    data.demoEnv = { "name": "APIC Todo demo-env", "vals": [{ "key": "host", "val": "apic.app", "readOnly": true }, { "key": "basePath", "val": "/apic-demo", "readOnly": true }, { "key": "scheme", "val": "https://", "readOnly": true }], "_created": ts, _modified: ts, _id: data.demoDesignProj.setting.envId, "proj": { id: data.demoDesignProj._id, "name": "APIC Todo demo" } };

    data.demoFolder = { "_id": ts + '-folder-demo', "_created": ts, "_modified": ts, "name": "Project: APIC Todo demo", "desc": "This is a set of sample APIs to demonstrate how the Designer, Tester (running a request, Test Suites etc) & Docs work.", "projId": "1489390857757b643d37b804a6-demo" };

    data.demoReqs = [{ "method": "POST", "_id": ts + "-req1-demo", "description": "The API to create a todo. Providing todo name is mandatory.", "env": { "_id": data.demoEnv._id, "name": "APIC Todo demo-env" }, "name": "Create Todo", "postscript": "//save the newly created Todo id in environment\nvar newId = $response.data.todo.id;\nlog(\"new todo id is: \"+newId);\nsetEnv(\"todoId\", newId);\n\nTESTS[\"Check that Status code is 201 (Created)\"] = $response.status == 201;\nTESTS[\"Response data should match the schema for status 200\"] = validateSchema(200);", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "response": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] }, "message": { "type": "string", "enum": ["Todo created successfully"] } }, "required": ["response", "message"], "definitions": { "Todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } } }, { "code": "400", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Please provide a ToDo Name"] } }, "required": ["message"], "definitions": { "Todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "type": "raw", "selectedRaw": { "name": "JSON", "val": "application/json" }, "rawData": "{\n\t\"name\": \"{{apic.randomStr(10, 30)}} \"\n}" }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo", "_parent": data.demoFolder._id }, { "method": "GET", "_id": ts + "-req2-demo", "description": "The API to get the to do by providing its id in the API path as a path parameter", "env": { "_id": data.demoEnv._id, "name": "APIC Todo demo-env" }, "name": "Get Todo detail", "postscript": "TESTS[\"Check that Status code is 200\"] = $response.status == 200;\nTESTS[\"Response data should match the schema for status 200\"] = validateSchema(200);", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "response": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] }, "message": { "type": "string", "enum": ["Todo retrived successfully"] } }, "required": ["response", "message"], "definitions": { "Todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } } }, { "code": "404", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Failed to fetch todo detail"] } }, "definitions": { "Todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": {}, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo/{{todoId}}", "_parent": data.demoFolder._id }, { "method": "DELETE", "_id": ts + "-req3-demo", "description": "", "env": { "_id": data.demoEnv._id, "name": "APIC Todo demo-env" }, "name": "Delete Todo", "postscript": "TESTS[\"Check that Status code is 200\"] = $response.status == 200;\nTESTS[\"Response data should match the schema for status 200\"] = validateSchema(200);", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Todo deleted"] } }, "required": ["message"], "definitions": { "Todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } } }, { "code": "404", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Couldn't find the specified todo"] } }, "required": ["message"], "definitions": { "Todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo", "default": false }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] } } } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "type": "raw", "selectedRaw": { "name": "JSON", "val": "application/json" }, "rawData": "{}" }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo/{{todoId}}", "_parent": data.demoFolder._id }];

    data.demoTestProj = { _created: ts, _modified: ts, _id: ts + '-testproj-demo', name: "APIC", expanded: true };

    data.demoSuit = { "_id": ts + '-testsuite-demo', "name": "ToDo demo", "projId": data.demoTestProj._id, "_created": ts, "_modified": ts, "reqs": [{ "method": "POST", "_id": "1489578622230-6ef3543eb00ad-demo", "description": "The API to create a todo. Providing todo name is mandatory.", "env": { "_id": data.demoEnv._id, "name": "APIC Todo demo-env" }, "name": "Create Todo without name", "postscript": "apic.test(\"Check that Status code is 400 (bad request)\", function(){\n\texpect($response.status).to.be.eql(200);//Change it to 400 to fix this test\n})\napic.test(\"JSON Response message should report the 'name missing' error\", function(){\n\texpect($response.data.message).to.be.eql(\"Please provide a ToDo Name\");\n})\napic.test(\"Response data should match the schema specified against status 400\", function(){\n\texpect($response).to.matchSchema(400);\n})", "prescript": "log(\"Trying to create todo without name\");", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo" }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] }, "message": { "type": "string", "enum": ["Todo created successfully"] } }, "required": ["todo", "message"] } }, { "code": "400", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Please provide a ToDo Name"] } }, "required": ["message"] } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "type": "raw", "selectedRaw": { "name": "JSON", "val": "application/json" }, "rawData": "{}", "xForms": [{ "key": "", "val": "" }], "formData": [{ "key": "", "val": "", "type": "Text" }] }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo", "_parent": "14894000929260dd9b5b653817", "data": "{}" }, { "method": "POST", "_id": "1489578622230-6ef3543eb00ad-demo", "description": "The API to create a todo. Providing todo name is mandatory.", "env": { "_id": "1489394818482-dceaa7cdafb3e", "name": "APIC Todo demo-env" }, "name": "Create valid Todo", "postscript": "apic.test(\"Check that Status code is 201 (Created)\", function(){\n\texpect($response.status).to.be.eql(201);\n})\napic.test(\"Response data should match the schema for status 201\", function(){\n\texpect($response).to.matchSchema(201);\n})\napic.test(\"$response.data.todo.name should be equal to $request.body.name\", function(){\n\texpect($response.data.todo.name).to.be.eql($request.body.name);\n})\napic.test(\"$response.data.message should be equal to \\\"Todo created successfully\\\"\", function(){\n\texpect($response.data.message).to.be.eql(\"Todo created successfully\");\n})\napic.test(\"$response.data.todo.id should exist in response\", function(){\n\texpect($response.data.todo).to.have.property(\"id\");\n})\n\n\n//save the newly created Todo id in environment\nvar newId = $response.data.todo.id;\nlog(\"new todo id is: \"+newId);\nsetEnv(\"todoId\", newId);\n", "prescript": "log(\"Creating valid Todo\")", "respCodes": [{ "code": "201", "data": { "type": "object", "properties": { "todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo" }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] }, "message": { "type": "string", "enum": ["Todo created successfully"] } }, "required": ["todo", "message"] } }, { "code": "400", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Please provide a ToDo Name"] } }, "required": ["message"] } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "type": "raw", "selectedRaw": { "name": "JSON", "val": "application/json" }, "rawData": "{\n\t\"name\": \"{{apic.randomStr(10,30)}}\"\n}", "xForms": [{ "key": "", "val": "" }], "formData": [{ "key": "", "val": "", "type": "Text" }] }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo", "_parent": "14894000929260dd9b5b653817", "data": "{\n\t\"name\": \"{{apic.randomStr(10,30)}}\"\n}" }, { "method": "GET", "_id": "1489578622262-228e18d67ac5f8-demo", "description": "The API to get the to do by providing its id in the path API path as a path parameter", "env": { "_id": "1489394818482-dceaa7cdafb3e", "name": "APIC Todo demo-env" }, "name": "Get Todo detail", "postscript": "apic.test(\"Check that Status code is 200\", function(){\n\texpect($response.status).to.be.eql(200);\n})\napic.test(\"Response data should match the schema specified against status 200\", function(){\n\texpect($response).to.matchSchema(200);\n})\napic.test(\"$response.data.todo.id should be equal to environment variable todoId\", function(){\n\texpect( $response.data.todo.id).to.be.eql(getEnv(\"todoId\"))\n})", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo" }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] }, "message": { "type": "string", "enum": ["Todo retrived successfully"] } }, "required": ["todo", "message"] } }, { "code": "404", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Failed to fetch todo detail"] } } } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "xForms": [{ "key": "", "val": "" }], "formData": [{ "key": "", "val": "", "type": "Text" }] }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo/{{todoId}}", "_parent": "14894000929260dd9b5b653817" }, { "method": "DELETE", "_id": "1489578622278-b97f857bdf9e4-demo", "description": "", "env": { "_id": "1489394818482-dceaa7cdafb3e", "name": "APIC Todo demo-env" }, "name": "Delete Todo", "postscript": "apic.test(\"Check that Status code is 200\", function(){\n\texpect($response.status).to.be.eql(200)\n})\napic.test(\"Response data should match the schema specified against status 200\", function(){\n\texpect($response).to.matchSchema(200);\n})\napic.test(\"$response.data.message should be equal to \\\"Todo deleted\\\"\", function(){\n\texpect($response.data.message).to.be.eql(\"Todo deleted\");\n})", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Todo deleted"] } }, "required": ["message"] } }, { "code": "404", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Couldn't find the specified todo"] } }, "required": ["message"] } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "type": "raw", "selectedRaw": { "name": "JSON", "val": "application/json" }, "rawData": "{}", "xForms": [{ "key": "", "val": "" }], "formData": [{ "key": "", "val": "", "type": "Text" }] }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo/{{todoId}}", "_parent": "14894000929260dd9b5b653817", "data": "{}" }, { "method": "GET", "_id": "1489578622262-228e18d67ac5f8-demo", "description": "The API to get the to do by providing its id in the path API path as a path parameter", "env": { "_id": "1489394818482-dceaa7cdafb3e", "name": "APIC Todo demo-env" }, "name": "Get Todo detail after delete", "postscript": "apic.test(\"Check that Status code is 404\", function(){\n\texpect($response.status).to.be.eql(404);\n})\napic.test(\"Response data should match the schema specified against status 404\", function(){\n\texpect($response).to.matchSchema(404);\n})", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "todo": { "type": "object", "properties": { "id": { "type": "string", "description": "Todo id" }, "name": { "type": "string", "description": "Todo name" }, "completed": { "type": "boolean", "description": "Completion status of the todo" }, "created": { "type": "integer", "description": "Todo creation timestamp" } }, "required": ["id", "name"] }, "message": { "type": "string", "enum": ["Todo retrived successfully"] } }, "required": ["todo", "message"] } }, { "code": "404", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Failed to fetch todo detail"] } }, "required": ["message"] } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "xForms": [{ "key": "", "val": "" }], "formData": [{ "key": "", "val": "", "type": "Text" }] }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo/{{todoId}}", "_parent": "14894000929260dd9b5b653817" }, { "method": "DELETE", "_id": "1489578622278-b97f857bdf9e4-demo", "description": "", "env": { "_id": "1489394818482-dceaa7cdafb3e", "name": "APIC Todo demo-env" }, "name": "Delete already deleted Todo", "postscript": "apic.test(\"Check that Status code is 404\", function(){\n\texpect($response.status).to.be.eql(404);\n})\napic.test(\"Response data should match the schema specified against status 404\", function(){\n\texpect($response).to.matchSchema(404);\n})", "prescript": "", "respCodes": [{ "code": "200", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Todo deleted"] } }, "required": ["message"] } }, { "code": "404", "data": { "type": "object", "properties": { "message": { "type": "string", "enum": ["Couldn't find the specified todo"] } }, "required": ["message"] } }], "Req": { "headers": [{ "key": "", "val": "" }], "url_params": [{ "key": "", "val": "" }] }, "Body": { "type": "raw", "selectedRaw": { "name": "JSON", "val": "application/json" }, "rawData": "{}", "xForms": [{ "key": "", "val": "" }], "formData": [{ "key": "", "val": "", "type": "Text" }] }, "url": "{{scheme}}{{host}}{{basePath}}/v2/todo/{{todoId}}", "_parent": "14894000929260dd9b5b653817", "data": "{}" }], "env": data.demoEnv._id, "expanded": true };

    return data;
}

function getURLs() {
    var host = environment.host;
    var base = host + 'api/';
    var userBase = base + 'user/';

    return {
        host,
        base,
        register: base + 'register',
        login: base + 'login',
        logout: base + 'logout',
        forgotPsd: base + 'forgotPsd',
        socketUrl: base + 'gs-guide-websocket',
        notifications: base + 'notifications',
        registerDummy: base + 'addDummyUser',
        checkUpdate: base + 'checkUpdate',
        publishDoc: userBase + 'publishedDocs',
        dashboard: userBase + 'dashboard',
        team: userBase + 'team',
        teamMember: userBase + 'team/{%teamId%}/member/',
        teamMemberOf: userBase + 'team/memberOf/',
        teamExit: userBase + 'team/{%teamId%}/exit',
        teamInvite: userBase + 'team/invite',
        findUser: userBase + 'findUser',
        share: userBase + 'share',
        unshare: userBase + 'unshare',
        enableMock: userBase + 'simulator/enable/',
        disableMock: userBase + 'simulator/disable/',
        account: userBase + 'account/',
        accUpdate: userBase + 'account/update/',
        changePsd: userBase + 'account/changePsd/',
        featureRequest: base + 'featureRequest',
        webAccess: userBase + 'webAccessUrl/APICSuite/',
    };
}

function getConstants() {
    return {
        default_method: 'GET',
        themes: {
            types: {
                dark: {
                    '--header-bg': '#1d1d1d',
                    '--main-bg': '#1c1c1c',
                    '--text-color': '#e0e0e0',
                    '--text-color-bold': '#ffffff',
                    '--content-bg': '#252629',
                    '--accent-bg-text': '#ffffff',
                    '--border-color': '#7575757d',
                    '--content-bg-contrast': '#1d1d1d',
                    '--input-bg': '#d1ebff1f'
                },
                light: {
                    '--header-bg': '#e1e1e1',
                    '--main-bg': '#efefef',
                    '--text-color': '#666666',
                    '--text-color-bold': '#333333',
                    '--content-bg': '#fff',
                    '--content-bg-contrast': '#e1e1e1',
                    '--accent-bg-text': '#ffffff',
                    '--border-color': '#ccc',
                    '--input-bg': '#d1ebff'
                },
            },
            accents: ['#2196f3', '#24BAFF', '#E81123', '#F7630C', '#EA005E', '#FF8C00', '#E3008C', '#9A0089', '#FF4343', '#00CC6A', '#107C10']
        },
        reqBodySnippets: [{
            text: 'Generate random string (length)',
            code: '"{{apic.randomStr(30)}}"'
        }, {
            text: 'Generate random number (min, max, isDecimal)',
            code: '{{apic.randomNum(1,999)}}'
        }, {
            text: 'Generate random email',
            code: '"{{apic.randomEmail()}}"'
        }, {
            text: 'Generate random from a list',
            code: '"{{apic.randomInList([1, \'foo\', \'bar@xyz.com\', 2.396])}}"'
        }, {
            text: 'Generate random from UUID',
            code: '"{{apic.uuid()}}"'
        }],
        restrictedHeaders: [
            "ACCEPT-CHARSET",
            "ACCEPT-ENCODING",
            "ACCESS-CONTROL-REQUEST-HEADERS",
            "ACCESS-CONTROL-REQUEST-METHOD",
            "CONTENT-LENGTHNECTION",
            "CONTENT-LENGTH",
            "COOKIE",
            "CONTENT-TRANSFER-ENCODING",
            "DATE",
            "EXPECT",
            "HOST",
            "KEEP-ALIVE",
            "ORIGIN",
            "REFERER",
            "TE",
            "TRAILER",
            "TRANSFER-ENCODING",
            "UPGRADE",
            "USER-AGENT",
            "VIA"
        ]
    };
}

export const Const = getConstants();
export const ApicUrls = getURLs();
export const DemoData = getDemoData();
export const HTTP_HEADERS = ['Accept', 'Accept-Charset', 'Accept-Encoding', 'Accept-Language', 'Accept-Datetime', 'Authorization', 'Cache-Control', 'Connection', 'Cookie', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'Expect', 'Forwarded', 'From', 'Host', 'If-Match', 'If-Modified-Since', 'If-None-Match', 'If-Range', 'If-Unmodified-Since', 'Max-Forwards', 'Origin', 'Pragma', 'Proxy-Authorization', 'Range', 'Referer', 'Referer [sic]', 'TE', 'User-Agent', 'Upgrade', 'Via', 'Warning', 'X-Requested-With', 'DNT', 'X-Forwarded-For', 'X-Forwarded-Host', 'X-Forwarded-Proto', 'Front-End-Https', 'X-Http-Method-Override', 'X-ATT-DeviceId', 'X-Wap-Profile', 'Proxy-Connection', 'X-UIDH', 'X-Csrf-Token'];
export const HTTP_METHODES = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
export const MIMEs = ['application/json', 'application/javascript', 'application/x-www-form-urlencoded', 'application/xml', 'multipart/form-data', 'text/html', 'text/plain', 'application/zip', 'application/EDI-X12', 'application/EDIFACT', 'application/atom+xml', 'application/font-woff', 'application/gzip', 'application/octet-stream', 'application/ogg', 'application/pdf', 'application/postscript', 'application/soap+xml', 'application/x-bittorrent', 'application/x-tex', 'application/xhtml+xml', 'application/xml-dtd', 'application/xop+xml'];
export const METHOD_WITH_BODY = ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
export const RAW_BODY_TYPES = [
    { name: 'Text', val: 'text/plain;charset=UTF-8' },
    { name: 'Text', val: 'text/plain' },
    { name: 'JSON', val: 'application/json' },
    { name: 'Javascript', val: 'application/javascript' },
    { name: 'XML', val: 'application/xml' },
    { name: 'XML', val: 'text/xml' },
    { name: 'HTML', val: 'xml/html' }
];
export const TestSnips = [{
    text: 'Set an Environment variable',
    code: 'setEnv("variable_name", "variable_value");'
}, {
    text: 'Read Environment vatiable value',
    code: 'getEnv("variable_name");'
}, {
    text: 'Remove an Environment vatiable',
    code: 'removeEnv("variable_name");'
}, {
    text: 'Status code is 200',
    code: 'apic.test("Check that Status code is 200", function(){\n\t<<assert>>;\n});',
    params: ['$response.status', 200, 'eql']
}, {
    text: 'Status code is not 404',
    code: 'apic.test("Status code should not be 404", function(){\n\t<<assert>>;\n});',
    params: ['$response.status', 404, 'eql', true]
}, {
    text: 'Status Text is OK',
    code: 'apic.test("Status Text is OK", function(){\n\t<<assert>>;\n});',
    params: ['$response.statusText', '"OK"', 'eql']
}, {
    text: 'Time taken is less than 2 sec',
    code: 'apic.test("Time taken is less than or equals to 2 sec", function(){\n\t<<assert>>;\n});',
    params: ['$response.timeTaken', 2000, 'lte']
}, {
    text: 'String Response body contains specific string',
    code: 'apic.test("Response raw body contains string \'your_string\'", function(){\n\t<<assert>>;\n});',
    params: ['$response.body', '"your_string"', 'include']
}, {
    text: 'String Response body is equals to',
    code: 'apic.test("Response raw body is equals to \'your_string\'", function(){\n\t<<assert>>;\n});',
    params: ['$response.body', '"your_string"', 'eql']
}, {
    text: 'JSON Response property and value check',
    code: 'apic.test("JSON Response should have a property \'id\' with value as 12345", function(){\n\texpect($response.data).to.have.property("id").and.to.be.eql(\'12345\');\n});'
}, {
    text: 'Response has the header Content-Type',
    code: 'apic.test("Response has the header Content-Type", function(){\n\t$response.headers.has("Content-Type");\n});'
}, {
    text: 'Response header value check',
    code: 'apic.test("The value of response header Content-Type is application/json", function(){\n\t<<assert>>;\n});',
    params: ['$response.headers.getValue("content-Type")', '"application/json"', 'eql']
}, {
    text: 'Add log (response body)',
    code: '//logs the entire response body in logs tab;\nlog($response.body);'
}, {
    text: 'Add log (time taken)',
    code: 'log("Time taken for request to complete is :"+ $response.timeTaken+" milisecond");'
}, {
    text: 'Validate response with schema against status code 200',
    code: 'apic.test("Response data should match the schema specified against status 200", function(){\n\texpect($response).to.matchSchema(200);\n});'
}, {
    text: 'Validate response with current schema',
    code: 'apic.test("Response data should match the specified schema for current status code", function(){\n\texpect($response).to.matchSchema();\n});'
}, {
    text: 'Generate random string (length)',
    code: 'var randStr = apic.randomStr(30);'
}, {
    text: 'Generate random number (min, max, isDecimal)',
    code: 'var randNum = apic.randomNum(1,999);'
}, {
    text: 'Generate random email',
    code: 'var randomEmail = apic.randomEmail();'
}, {
    text: 'Generate random from a list',
    code: 'var randomList = apic.randomInList([1, \'foo\', \'bar@xyz.com\', 2.396]);'
}, {
    text: 'Generate random from UUID',
    code: 'var randomUUID = apic.uuid();'
}
]
