import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs, configureVueProject } from '@vue/eslint-config-typescript' // [!code ++]
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// Настраиваем проект так, чтобы линтер разрешал использовать обычный JavaScript
configureVueProject({ scriptLangs: ['ts', 'js'] }) // [!code ++]

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,cjs,ts,mts,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  // Жестко отключаем правило, которое ругалось на отсутствие "lang=ts"
  { // [!code ++]
    files: ['**/*.vue'], // [!code ++]
    rules: { // [!code ++]
      'vue/block-lang': 'off' // [!code ++]
    } // [!code ++]
  }, // [!code ++]

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
