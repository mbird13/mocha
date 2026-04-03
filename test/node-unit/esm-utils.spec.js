"use strict";

const esmUtils = require("../../lib/nodejs/esm-utils");
const sinon = require("sinon");
const url = require("node:url");

describe("esm-utils", function () {
  describe("requireOrImport", function () {
    it("should show an informative error message for a broken default import", async function () {
      return expect(
        () =>
          esmUtils.requireOrImport(
            "../../test/node-unit/fixtures/broken-default-import.mjs",
          ),
        "to be rejected with error satisfying",
        {
          name: "SyntaxError",
          message:
            "The requested module './module-without-default-export.mjs' does not provide an export named 'default'",
        },
      );
    });

    it("should show a syntax error message when importing a TypeScript file with invalid syntax", async function () {
      return expect(
        () =>
          esmUtils.requireOrImport(
            "../../test/node-unit/fixtures/broken-syntax.ts",
          ),
        "to be rejected with error satisfying",
        {
          name: "SyntaxError",
          message: /Invalid or unexpected token|Expected ident/,
        },
      );
    });

    it("should surface the ts-node TSError error rather than falling back to `import(...)`", async function () {
      return expect(
        () =>
          esmUtils.requireOrImport(
            "../../test/node-unit/fixtures/mock-ts-node-compile-err.ts",
          ),
        "to be rejected with error satisfying",
        {
          name: "TSError",
          message: /A TS compilation error/,
        },
      );
    });

    it("should surface Mocha errors rather than falling back to `import(...)`", async function () {
      return expect(
        () =>
          esmUtils.requireOrImport(
            "../../test/node-unit/fixtures/mock-mocha-forbidden-exclusivity-err.ts",
          ),
        "to be rejected with error satisfying",
        {
          code: "ERR_MOCHA_FORBIDDEN_EXCLUSIVITY",
          message: /`\.only` is not supported in parallel mode/,
        },
      );
    });

    it("should support file URLs with query and fragment", async function () {
      const fixtureUrl = url.pathToFileURL(
        require.resolve("./fixtures/module-without-default-export.mjs"),
      );
      fixtureUrl.search = "?time=1";
      fixtureUrl.hash = "#suite";

      const result = await esmUtils.requireOrImport(fixtureUrl.toString());
      expect(result, "to satisfy", {
        value: 42,
      });
    });

    it("should support file URLs with query string", async function () {
      const fileUrl = url.pathToFileURL("./test/node-unit/fixtures/module_using_query_string.mjs");
      const fileString = fileUrl.toString() + "?query=test";
      
      const result = await esmUtils.requireOrImport(fileString);
      expect(result, "to satisfy", {query_value: 'test'});
    })
  });

  describe("loadFilesAsync()", function () {
    beforeEach(function () {
      sinon.stub(esmUtils, "doImport").resolves({});
    });

    afterEach(function () {
      sinon.restore();
    });

    it("should not decorate imported module if no decorator passed", async function () {
      await esmUtils.loadFilesAsync(
        ["/foo/bar.mjs"],
        () => {},
        () => {},
      );

      expect(
        esmUtils.doImport.firstCall.args[0].toString(),
        "to be",
        url.pathToFileURL("/foo/bar.mjs").toString(),
      );
    });

    it("should decorate imported module with passed decorator", async function () {
      await esmUtils.loadFilesAsync(
        ["/foo/bar.mjs"],
        () => {},
        () => {},
        (x) => `${x}?foo=bar`,
      );

      expect(
        esmUtils.doImport.firstCall.args[0].toString(),
        "to be",
        `${url.pathToFileURL("/foo/bar.mjs").toString()}?foo=bar`,
      );
    });
    
    it("should preserve file URL with query and fragment", async function () {
      const fileUrl = `${url.pathToFileURL("/foo/bar.mjs").toString()}?foo=bar#baz`;

      await esmUtils.loadFilesAsync([fileUrl], () => {}, () => {});
      expect(esmUtils.doImport.firstCall.args[0], "to be", fileUrl);
    });
  });
});
