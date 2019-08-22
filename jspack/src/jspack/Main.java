package jspack;

import java.io.File;

import html.impl.HtmlJsAutoImporterImpl;
import jspack.impls.PackHandlerImpl;
import jspack.impls.PackToOneCheckerImpl;

/**
 *<ol>
 *    	打包js:
 *    	<li>把有相同前缀的js，合成一个 js</li>
 *      <li>自动更改html，加入依赖的js标签</li>
 *</ol>
 * @author jiangjiang
 *
 */
public class Main {
	public static void main(String[] args)
	{
		File file = new File(System.getProperty("user.dir"));
		file = file.getParentFile();
		String parentDir = file.getAbsolutePath();
		String dir = parentDir+ File.separator + "js";
		if(args.length > 0)
		{
			dir = args[0];
		}
		IPackToOneChecker checker = new PackToOneCheckerImpl();
		checker.addNeedPackHandlder(new PackHandlerImpl());
		checker.check(dir);
		
		//html
		HtmlJsAutoImporterImpl jsImporter = new HtmlJsAutoImporterImpl();
		jsImporter.handleOn(parentDir);
		
		while(true)
		{
			checker.handle();		
			try {
				Thread.sleep(200);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
}
