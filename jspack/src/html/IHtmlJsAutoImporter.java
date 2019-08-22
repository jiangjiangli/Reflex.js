package html;

public interface IHtmlJsAutoImporter {
	/**
	 * 在指定文件夹以及子文件夹查找@前缀的html,自动导入include html的js。
	 * @param dir
	 */
	void handleOn(String dir);
}
