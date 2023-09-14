export default {
  isStub: true,

  init() {},

  async register(_?: boolean): Promise<void> {
    return Promise.resolve()
  },

  unregister(): Promise<string> {
    return Promise.resolve('')
  }
}
