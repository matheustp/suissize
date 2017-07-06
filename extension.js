'use strict'
const vscode = require('vscode')
const standardFormat = require('./standard-format')

const replaceParenthesisAndBrackets = (text) => {
  const regexOpeningParenthesisAndBrackets = /(\{|\(|\[)(\b|\(|\'|\`|\"|\{|\[|\!|\/|\+|\-)/g
  const regexClosingParenthesisAndBrackets = /(\b|\+|\-|\)|\'|\`|\"|\}|\]|\!|\/)(\}|\]|\))/g
  const fixNestedOpeningParenthesisAndBrackets = /(\{|\(|\[)(\{|\(|\[)/g
  const fixNestedClosingParenthesisAndBrackets = /(\}|\]|\))(\}|\]|\))/g
  const fixElse = /(\})(else)/g
  return text.replace(fixNestedClosingParenthesisAndBrackets, `$1 $2`)
    .replace(fixNestedOpeningParenthesisAndBrackets, `$1 $2`)
    .replace(regexOpeningParenthesisAndBrackets, `$1 $2`)
    .replace(regexClosingParenthesisAndBrackets, `$1 $2`)
    .replace(fixElse, `$1 $2`)
}

const removeMultiLine = (text) => {
  const regexMultiLine = /(.)(\n\n)(\n)+/g
  return text.replace(regexMultiLine, `$1$2`)
}

const fixSemiColon = (text) => {
  return text.replace(/;(\w|\-|\+)/g, `; $1`)
}

const protectArrowFunction = (text) => {
  return text.replace(/=>( )*\n((^(?!const|let|\/\*)(.| )*$)(\n(?!const|let|\/\*)(.| )*)*)/gm, `=> { /*shield*/\n$2/*shield*/}`)
}

const unproctectArrowFunction = (text) => {
  const regexCloseProtection = /\/\*shield\*\/\}/g
  const regexOpenProtection = /\{ \/\*shield\*\//g
  return text.replace(regexCloseProtection, ``).replace(regexOpenProtection, ``)
}

const formatErrorMessage = (text) => {
  return text.replace(/\((\d+)/g, `( Line $1`)
    .replace(/\:(\d+)/g, `: Col $1`)
}

const recoverRegex = (text, arrayOfRegex) => {
  if (arrayOfRegex != null && arrayOfRegex.length > 0) {
    let positionArray = 0
    text = text.replace(/\/.*\/\s?\w*/g, (str) => {
      positionArray++
      return arrayOfRegex[positionArray - 1]
    })
  }
  return text
}

const checkIfCodeHasVar = (text) => {
  let indexVar = text.search(/(\svar\s)|(^var)/)
  if (indexVar !== -1) {
    let linesArray = text.substring(0, indexVar + 1).match(/\n/g)
    let numberOfLines = linesArray == null ? 1 : linesArray.length + 1
    vscode.window.showWarningMessage(`Are you dumb? Use "let" or "const" instead of "var". Line: ${numberOfLines}`)
  }
}

function suissize(option) {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  vscode.commands.executeCommand('acceptSelectedSuggestion').then(() => {
    const document = editor.document
    const start = new vscode.Position(0, 0)
    const end = new vscode.Position(document.lineCount - 1,
      document.lineAt(document.lineCount - 1).text.length)
    let range = new vscode.Range(start, end)
    let currentText = editor.document.getText(range)

    let options = vscode.FormattingOptions
    if (!options) {
      options = { insertSpaces: true, tabSize: 2 }
    }

    if (!currentText.isEmptyOrWhitespace) {
      let insertionSuccess = editor.edit((editBuilder) => {
        let formatted
        try {
          currentText = protectArrowFunction(currentText)
          formatted = standardFormat.transform(currentText)
        } catch (err) {
          vscode.window.showErrorMessage(formatErrorMessage(err.message))
          return
        }
        formatted = unproctectArrowFunction( formatted )
        let arrayOfRegex = formatted.match(/\/.*\/\s?\w*/g)
        formatted = replaceParenthesisAndBrackets(formatted)
        formatted = removeMultiLine(formatted)
        formatted = fixSemiColon(formatted)
        formatted = recoverRegex(formatted, arrayOfRegex)

        editBuilder.replace(range, formatted)
        checkIfCodeHasVar(formatted)
      })

      if (!insertionSuccess) return
    }
  })
}

function activate(context) {
  const formatIndentCode = vscode.commands.registerCommand('suissize.formatIndentCode', () => {
    suissize('formatIndentCode')
  })
  context.subscriptions.push(formatIndentCode)
}

exports.activate = activate
